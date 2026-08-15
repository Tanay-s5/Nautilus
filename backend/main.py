from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from calibration import (
    get_user_weights,
    is_personalized,
    maybe_refit,
    ratings_until_next_refit,
)
from database import (
    add_card,
    add_links,
    add_rating,
    clear_canvas_data,
    get_all_cards,
    get_all_links,
    get_card_by_id,
    get_link_by_id,
    get_next_id,
    get_next_rating_id,
    get_rated_lids_for_user,
    get_ratings_for_user,
    get_settings,
    remove_card,
    update_settings,
)
from embedding import (
    BOUNDARY_BAND,
    LINK_THRESHOLD,
    WEIGHTS,
    default_score,
    embed_card_fields,
    field_cosine_scores,
    personalized_score,
    top_contributing_fields,
)
from llm import generate_card_data, generate_link_details
from validation import (
    Card,
    GenerateCardResponse,
    LinkRecord,
    LinkRecordPersonalized,
    PromptRequest,
    RatingRequest,
    SettingsUpdate,
    StoredCard,
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/ping")
def ping():
    return {"status": "ok"}

@app.post("/generate-card", response_model=GenerateCardResponse)
def generate_card(req: PromptRequest):
    data = generate_card_data(req.prompt)
    card = Card(**data)
    card_data = card.dict()

    embeddings = embed_card_fields(card_data)
    card_id = get_next_id()

    new_links: List[Dict[str, Any]] = []
    for existing in get_all_cards():
        field_scores = field_cosine_scores(embeddings, existing["embeddings"])
        score = default_score(field_scores)
        print(f"Card {existing['id']} ({existing['data']['title']}) v/s New card {card_id} -> {score}")
        if score > LINK_THRESHOLD:
            top_fields = top_contributing_fields(field_scores, WEIGHTS)
            link_details = generate_link_details(existing["data"], card_data, top_fields)
            new_links.append({
                "lid": f"{existing['id']} <-> {card_id}",
                "card_a_id": existing["id"],
                "card_b_id": card_id,
                "similarity": score,
                "field_scores": field_scores,
                "is_boundary": score <= LINK_THRESHOLD + BOUNDARY_BAND,
                "top3_fields": top_fields,
                "short_label": link_details["short_label"],
                "reason": link_details["reason"],
            })
    new_links.sort(key=lambda l: l["similarity"], reverse=True)

    if new_links:
        add_links(new_links)

    stored_card = {
        "id": card_id,
        "data": card_data,
        "embeddings": embeddings,
    }

    add_card(stored_card)

    return {"card": stored_card, "links": new_links}


@app.get("/cards", response_model=List[StoredCard])
def get_cards():
    return get_all_cards()


@app.get("/links", response_model=List[LinkRecordPersonalized])
def get_links(user: str = "default"):
    weights = get_user_weights(user)
    personalized = is_personalized(user)
    result = []
    for link in get_all_links():
        item = dict(link)
        item["user_similarity"] = (
            personalized_score(link["field_scores"], weights) if personalized else link["similarity"]
        )
        result.append(item)
    return result


@app.get("/links/candidates", response_model=List[LinkRecord])
def get_rating_candidates(user: str = "default", limit: int = 8):
    rated = get_rated_lids_for_user(user)
    unrated = [l for l in get_all_links() if l["lid"] not in rated]
    unrated.sort(key=lambda l: abs(l["similarity"] - LINK_THRESHOLD))
    return unrated[:limit]


@app.get("/card/{card_id}", response_model=StoredCard)
def get_card(card_id: int):
    card = get_card_by_id(card_id)
    if card is None:
        raise HTTPException(status_code=404, detail=f"Card {card_id} not found")
    return card


@app.delete("/card/{card_id}")
def delete_card(card_id: int):
    if not remove_card(card_id):
        raise HTTPException(status_code=404, detail=f"Card {card_id} not found")
    return {"message": f"Card {card_id} deleted"}


@app.delete("/canvas")
def delete_canvas():
    clear_canvas_data()
    return {"message": "Canvas cleared. Personalized weights and settings were preserved."}


@app.post("/rating")
def submit_rating(req: RatingRequest):
    user = req.user.strip() or "default"
    if not (0 <= req.rating <= 100):
        raise HTTPException(status_code=422, detail="rating must be between 0 and 100")

    link = get_link_by_id(req.lid)
    if link is None:
        raise HTTPException(status_code=404, detail=f"Link {req.lid} not found")

    rating_record = {
        "id": get_next_rating_id(),
        "user": user,
        "lid": req.lid,
        "card_a_id": link["card_a_id"],
        "card_b_id": link["card_b_id"],
        "rating": req.rating,
        "field_scores": link["field_scores"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    add_rating(rating_record)
    refit_happened = maybe_refit(user)

    return {
        "message": "Rating recorded",
        "refit_triggered": refit_happened,
        "ratings_until_next_refit": ratings_until_next_refit(user),
    }


@app.get("/weights/{user}")
def read_user_weights(user: str):
    return {
        "user": user,
        "weights": get_user_weights(user),
        "is_personalized": is_personalized(user),
        "total_ratings": len(get_ratings_for_user(user)),
        "ratings_until_next_refit": ratings_until_next_refit(user),
        "batch_size": get_settings()["batch_size"],
    }


@app.get("/settings")
def read_settings():
    return get_settings()


@app.put("/settings")
def write_settings(patch: SettingsUpdate):
    if patch.batch_size is not None and patch.batch_size < 1:
        raise HTTPException(status_code=422, detail="batch_size must be at least 1")
    return update_settings(patch.dict(exclude_unset=True))
