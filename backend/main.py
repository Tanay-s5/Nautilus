import os
import re
import threading
from contextlib import asynccontextmanager
from typing import Any, Dict, List
from uuid import UUID

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import database
from calibration import (
    get_user_weights,
    is_personalized,
    maybe_refit,
    ratings_until_next_refit,
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


@asynccontextmanager
async def lifespan(_app: FastAPI):
    database.open_pool()
    yield
    database.close_pool()


app = FastAPI(lifespan=lifespan)


_origins = os.getenv("CORS_ORIGINS", "http://localhost:8080,http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _origins.split(",") if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)





def visitor_id(x_visitor_id: str = Header(default="")) -> UUID:
    try:
        return UUID(x_visitor_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Missing or invalid X-Visitor-Id header")


#locks to prevent race condition
_user_locks: Dict[UUID, threading.Lock] = {}
_user_locks_guard = threading.Lock()

def _lock_for(user_id: UUID) -> threading.Lock:
    with _user_locks_guard:
        return _user_locks.setdefault(user_id, threading.Lock())


_LID_RE = re.compile(r"^(\d+) <-> (\d+)$")


def _parse_lid(lid: str):
    match = _LID_RE.match(lid)
    if not match:
        raise HTTPException(status_code=404, detail=f"Link {lid} not found")
    return int(match.group(1)), int(match.group(2))








@app.get("/ping")
def ping():
    try:
        database.ping()
    except Exception as e:
        print("DB health check failed:", repr(e))
        raise HTTPException(status_code=503, detail="Database unavailable")
    return {"status": "ok"}


@app.post("/generate-card", response_model=GenerateCardResponse)
def generate_card(req: PromptRequest, user_id: UUID = Depends(visitor_id)):
    with _lock_for(user_id):
        # 1. Slow work first, holding no database transaction: LLM call, then embeddings.
        card_data = Card(**generate_card_data(req.prompt)).model_dump()
        embeddings = embed_card_fields(card_data)

        # 2. Score against this visitor's existing cards (one query for all their vectors).
        new_links: List[Dict[str, Any]] = []
        card_data_by_id = {c["id"]: c["data"] for c in database.list_cards(user_id)}
        for existing in database.list_card_embeddings(user_id):
            field_scores = field_cosine_scores(embeddings, existing["embeddings"])
            score = default_score(field_scores)
            print(f"Card {existing['id']} ({existing['title']}) v/s new card -> {score}")
            if score > LINK_THRESHOLD:
                top_fields = top_contributing_fields(field_scores, WEIGHTS)
                link_details = generate_link_details(
                    card_data_by_id[existing["id"]], card_data, top_fields
                )
                new_links.append({
                    "other_card_id": existing["id"],
                    "similarity": score,
                    "field_scores": field_scores,
                    "is_boundary": score <= LINK_THRESHOLD + BOUNDARY_BAND,
                    "top3_fields": top_fields,
                    "short_label": link_details["short_label"],
                    "reason": link_details["reason"],
                })
        new_links.sort(key=lambda l: l["similarity"], reverse=True)

        # 3. One short transaction writes the card, its nine vectors and its links together.
        card_id = database.create_card_with_links(user_id, card_data, embeddings, new_links)

    links_out = [
        {
            "lid": f"{l['other_card_id']} <-> {card_id}",
            "card_a_id": l["other_card_id"],
            "card_b_id": card_id,
            **{k: l[k] for k in (
                "similarity", "field_scores", "is_boundary",
                "top3_fields", "short_label", "reason",
            )},
        }
        for l in new_links
    ]
    return {"card": {"id": card_id, "data": card_data}, "links": links_out}


@app.get("/cards", response_model=List[StoredCard])
def get_cards(user_id: UUID = Depends(visitor_id)):
    return database.list_cards(user_id)


@app.get("/links", response_model=List[LinkRecordPersonalized])
def get_links(user_id: UUID = Depends(visitor_id)):
    weights = get_user_weights(user_id)
    personalized = is_personalized(user_id)
    result = []
    for link in database.list_links(user_id):
        item = dict(link)
        item["user_similarity"] = (
            personalized_score(link["field_scores"], weights) if personalized else link["similarity"]
        )
        result.append(item)
    return result


@app.get("/links/candidates", response_model=List[LinkRecord])
def get_rating_candidates(limit: int = 8, user_id: UUID = Depends(visitor_id)):
    return database.list_link_candidates(user_id, LINK_THRESHOLD, max(1, min(limit, 50)))


@app.get("/card/{card_id}", response_model=StoredCard)
def get_card(card_id: int, user_id: UUID = Depends(visitor_id)):
    card = database.get_card(user_id, card_id)
    if card is None:
        raise HTTPException(status_code=404, detail=f"Card {card_id} not found")
    return card


@app.delete("/card/{card_id}")
def delete_card(card_id: int, user_id: UUID = Depends(visitor_id)):
    if not database.delete_card(user_id, card_id):
        raise HTTPException(status_code=404, detail=f"Card {card_id} not found")
    return {"message": f"Card {card_id} deleted"}


@app.delete("/canvas")
def delete_canvas(user_id: UUID = Depends(visitor_id)):
    database.clear_canvas(user_id)
    return {"message": "Canvas cleared. Personalized weights and settings were preserved."}


@app.post("/rating")
def submit_rating(req: RatingRequest, user_id: UUID = Depends(visitor_id)):
    card_a_id, card_b_id = _parse_lid(req.lid)
    link = database.get_link(user_id, card_a_id, card_b_id)
    if link is None:
        raise HTTPException(status_code=404, detail=f"Link {req.lid} not found")

    database.upsert_rating(user_id, link, round(req.rating))
    refit_happened = maybe_refit(user_id)

    return {
        "message": "Rating recorded",
        "refit_triggered": refit_happened,
        "ratings_until_next_refit": ratings_until_next_refit(user_id),
    }


@app.get("/weights")
def read_user_weights(user_id: UUID = Depends(visitor_id)):
    return {
        "user": str(user_id),
        "weights": get_user_weights(user_id),
        "is_personalized": is_personalized(user_id),
        "total_ratings": database.count_ratings(user_id),
        "ratings_until_next_refit": ratings_until_next_refit(user_id),
        "batch_size": database.get_batch_size(user_id),
    }


@app.get("/settings")
def read_settings(user_id: UUID = Depends(visitor_id)):
    return {"batch_size": database.get_batch_size(user_id)}


@app.put("/settings")
def write_settings(patch: SettingsUpdate, user_id: UUID = Depends(visitor_id)):
    if patch.batch_size is None:
        return {"batch_size": database.get_batch_size(user_id)}
    return {"batch_size": database.set_batch_size(user_id, patch.batch_size)}
