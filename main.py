from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any,List

from dotenv import load_dotenv

import os
import json

from sentence_transformers import SentenceTransformer
import torch
import numpy as np

from openai import OpenAI, RateLimitError, AuthenticationError, PermissionDeniedError
from fastapi.middleware.cors import CORSMiddleware


# ENV 
load_dotenv()
api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    raise ValueError("GROQ_API_KEY not found in .env")


client = OpenAI(
    api_key=api_key,
    base_url="https://api.groq.com/openai/v1"
)


DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

model = SentenceTransformer("all-MiniLM-L6-v2", device=DEVICE)

print(f"Embedding model running on: {DEVICE}")



def get_embedding(text: str):
    embedding = model.encode(
        text,
        convert_to_numpy=True,
        normalize_embeddings=True  
    )
    return embedding.tolist()

def embed_card_fields(card_data):
    return {
        "applications": get_embedding(" ".join(card_data["applications"])),
        "analogy": get_embedding(card_data["analogy"]),
        "corePrinciples": get_embedding(" ".join(card_data["corePrinciples"])),
        "mechanism": get_embedding(" ".join(card_data["mechanism"])),
        "examples": get_embedding(" ".join(card_data["examples"])),
        "misconceptions": get_embedding(" ".join(card_data["misconceptions"])),
        "constraints": get_embedding(" ".join(card_data["constraints"])),
        "problemPatterns": get_embedding(card_data["problemPatterns"]),
        "formalStructure": get_embedding(" ".join(card_data["formalStructure"]))
    }

def cosine_similarity(a, b):
    a = np.array(a)
    b = np.array(b)
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

WEIGHTS: Dict[str, float] = {
    "corePrinciples": 0.25,
    "mechanism": 0.25,
    "formalStructure": 0.15,
    "problemPatterns": 0.10,
    "applications": 0.10,
    "constraints": 0.05,
    "examples": 0.04,
    "misconceptions": 0.03,
    "analogy": 0.03,
}


LINK_THRESHOLD = 0.1

def compute_similarity(e1, e2) -> float:
    total_weight = sum(WEIGHTS.values()) or 1.0
    score = sum(
        weight * cosine_similarity(e1[field], e2[field])
        for field, weight in WEIGHTS.items()
    )
    return float(score / total_weight)


DB_FILE = "cards.json"

cards: List[Dict[str, Any]] = []
next_id: int = 0

def load_cards():
    global cards,next_id
    if os.path.exists(DB_FILE):
        with open(DB_FILE, "r") as f:
            cards = json.load(f)
    next_id=max((c["id"] for c in cards),default=-1)+1

def save_cards():
    with open(DB_FILE, "w") as f:
        json.dump(cards, f ,indent=2)


load_cards()



app = FastAPI()

#validation
class PromptRequest(BaseModel):
    prompt: str


class Card(BaseModel):
    title: str
    
    # FRONT (collapsed card)
    previewSummary: str   
    previewBullets: List[str]  
    
    # BACK (expanded card)
    details: str
    
    # LINKING DATA 
    applications: List[str]
    analogy: str
    corePrinciples: List[str]
    mechanism: List[str]
    examples: List[str]
    misconceptions: List[str]
    constraints: List[str]
    problemPatterns: str
    formalStructure: List[str]

class CardLink(BaseModel):
    id: int
    title: str
    score: float

class StoredCard(BaseModel):
    id: int
    data: Card
    links: List[CardLink] = []



# PROMPT stored
def build_prompt(user_prompt: str):
    return f"""
You must return ONLY valid JSON. No explanation. No markdown.

Format:
{{
  "title": "<max 5 words>",

  "previewSummary": "<20-30 words, extremely clear>",
  "previewBullets": [
    "<short point 5-10 words>",
    "<short point 5-10 words>",
    "<short point 5-10 words>"
  ],

  "details": "< Less than 50 words . MUST be a plain string. Use \\n for line breaks. No raw newlines.",
  "applications": [],
  "analogy": "<simple intuitive analogy>",
  "corePrinciples": [<Do not use the same points as previewBullets , make these more mathmatical or related to pyhsics or chemsitry>],
  "mechanism": [<A leads to B leads to C>],
  "examples": [],
  "misconceptions": [],
  "constraints": [],
  "problemPatterns": "",
  "formalStructure": [<like an underlying mathamatical fomula eg-linear equation slope intercep , exponential curve]
}}

Rules:
- preview = ultra concise
- details = deep but structured (bullets, not paragraphs)
+ details MUST be a single string, never an object or array
- No fluff
- No empty arrays (minimum 1 items) 
- NEVER include actual newlines inside strings , ALWAYS use \\n for line breaks
- Keep "details" under 50 words
- Do NOT repeat ideas
- Do NOT exeed 500 tokens 
 
Topic: {user_prompt}
"""


#  ENDPOINT 
@app.post("/generate-card", response_model=StoredCard)
def generate_card(req: PromptRequest):
    global next_id 

    prompt = build_prompt(req.prompt)

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",  
            messages=[
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            max_tokens=500,
            response_format={"type": "json_object"}
        )

        text = response.choices[0].message.content.strip()
    except Exception as e:
        print("RAW ERROR:", repr(e))
        error_str = str(e)
        # rate limit errors
        if "RESOURCE_EXHAUSTED" in error_str or "429" in error_str:
            raise HTTPException(
                status_code=429,
                detail="Rate limit exceeded. Please retry in ~50 seconds. Consider enabling billing for higher limits."
            )
        # auth errors
        elif "PERMISSION_DENIED" in error_str or "403" in error_str:
            raise HTTPException(
                status_code=403,
                detail="API key is invalid or doesn't have permission. Check your GEMINI_API_KEY in .env"
            )
        else:
            raise HTTPException(
                status_code=500,
                detail=f"API error: {error_str}"
            )
        


    # Clean markdown if LLM adds it
    text = text.replace("```json", "").replace("```", "").strip()

    try:
        data = json.loads(text)
    except Exception as e:
        print("Invalid JSON from LLM:\n", text)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse model response as JSON: {str(e)}"
        )

    card = Card(**data)

    embeddings = embed_card_fields(card.dict())

    card_id = next_id
    next_id += 1

    links: List[Dict[str, Any]] = []
    for existing in cards:
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

    cards.append(stored_card)
    save_cards()

    return stored_card   



    
@app.get("/cards",response_model=List[StoredCard])
def get_cards():
    return cards

@app.get("/card/{card_id}", response_model=StoredCard)
def get_card(card_id: int):
    for c in cards:
        if c["id"] == card_id:
            return c
    raise HTTPException(status_code=404, detail=f"Card {card_id} not found")
    
@app.delete("/card/{card_id}")
def delete_card(card_id: int):
    for c in cards:
        if c["id"] == card_id:
            cards.remove(c)
            save_cards()
            return {"message": f"Card {card_id} deleted"}
    raise HTTPException(status_code=404, detail=f"Card {card_id} not found")

@app.delete("/cards")
def delete_all_cards():
    global cards, next_id
    cards = []
    next_id = 0
    save_cards()
    return {"message": "All cards deleted"}

