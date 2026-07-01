from typing import Any, Dict, List

from fastapi import FastAPI, HTTPException

from database import (
    add_card,
    clear_cards,
    get_all_cards,
    get_card_by_id,
    get_next_id,
    remove_card,
)
from embedding import LINK_THRESHOLD, compute_similarity, embed_card_fields
from llm import generate_card_data
from validation import Card, PromptRequest, StoredCard

app = FastAPI()


@app.post("/generate-card", response_model=StoredCard)
def generate_card(req: PromptRequest):
    data = generate_card_data(req.prompt)
    card = Card(**data)

    embeddings = embed_card_fields(card.dict())
    card_id = get_next_id()

    links: List[Dict[str, Any]] = []
    for existing in get_all_cards():
        score = compute_similarity(embeddings, existing["embeddings"])
        print(f"Card {existing['id']} ({existing['data']['title']}) v/s New card {card_id} -> {score}")
        print(f"link threshold- {LINK_THRESHOLD}")
        if score > LINK_THRESHOLD:
            print("Link is adding yoooo!!!!")
            links.append({
                "id": existing["id"],
                "title": existing["data"]["title"],
                "score": score,
            })
    links.sort(key=lambda l: l["score"], reverse=True)

    stored_card = {
        "id": card_id,
        "data": card.dict(),
        "embeddings": embeddings,
        "links": links
    }

    add_card(stored_card)

    return stored_card


@app.get("/cards", response_model=List[StoredCard])
def get_cards():
    return get_all_cards()


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