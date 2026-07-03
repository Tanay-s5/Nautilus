from typing import Any, Dict, List

from fastapi import FastAPI, HTTPException

from database import (
    add_card,
    add_links,
    clear_cards,
    get_all_cards,
    get_all_links,
    get_card_by_id,
    get_next_id,
    remove_card,
)
from embedding import (
    LINK_THRESHOLD,
    compute_similarity,
    embed_card_fields,
    top_contributing_fields,
)
from llm import generate_card_data, generate_link_reason
from validation import Card, GenerateCardResponse, LinkRecord, PromptRequest, StoredCard

app = FastAPI()


@app.post("/generate-card", response_model=GenerateCardResponse)
def generate_card(req: PromptRequest):
    data = generate_card_data(req.prompt)
    card = Card(**data)
    card_data = card.dict()

    embeddings = embed_card_fields(card_data)
    card_id = get_next_id()

    new_links: List[Dict[str, Any]] = []
    for existing in get_all_cards():
        score = compute_similarity(embeddings, existing["embeddings"])
        print(f"Card {existing['id']} ({existing['data']['title']}) v/s New card {card_id} -> {score}")
        if score > LINK_THRESHOLD:
            top_fields = top_contributing_fields(embeddings, existing["embeddings"])
            reason = generate_link_reason(existing["data"], card_data, top_fields)
            new_links.append({
                "lid": f"{existing['id']} <-> {card_id}",
                "similarity": score,
                "top3_fields": top_fields,
                "reason": reason,
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


@app.get("/links", response_model=List[LinkRecord])
def get_links():
    return get_all_links()


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


@app.delete("/cards")
def delete_all_cards():
    clear_cards()
    return {"message": "All cards deleted"}