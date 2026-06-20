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

def compute_similarity(e1, e2) -> float:
    total_weight = sum(WEIGHTS.values()) or 1.0
    score = sum(
        weight * cosine_similarity(e1[field], e2[field])
        for field, weight in WEIGHTS.items()
    )
    return float(score / total_weight)

LINK_THRESHOLD = 0.5

DB_FILE = "cards.json"

def load_cards():
    global cards
    if os.path.exists(DB_FILE):
        with open(DB_FILE, "r") as f:
            cards = json.load(f)

def save_cards():
    with open(DB_FILE, "w") as f:
        json.dump(cards, f ,indent=2)

cards = []
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

class StoredCard(BaseModel):
    id: int
    data: Card

# ------------------ PROMPT BUILDER ------------------
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


# ------------------ ENDPOINT ------------------
@app.post("/generate-card", response_model=StoredCard)
def generate_card(req: PromptRequest):

    prompt = build_prompt(req.prompt)

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",  
            messages=[
                {"role": "user", "content": prompt}
            ],
            temperature=0.2
        )

        text = response.choices[0].message.content.strip()
    except Exception as e:
        print("RAW ERROR:", repr(e))
        error_str = str(e)
        # Check for rate limit errors
        if "RESOURCE_EXHAUSTED" in error_str or "429" in error_str:
            raise HTTPException(
                status_code=429,
                detail="Rate limit exceeded. Please retry in ~50 seconds. Consider enabling billing for higher limits."
            )
        # Check for auth errors
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

    card_id = len(cards)

    for i in cards:
        if i["id"] == card_id:
            continue

        score = compute_similarity(
            embeddings,
            i["embeddings"]
        )

        print(f"New card {card_id} vs card {i['id']} ({i['data']['title']}) → {score}")

    stored_card = {
    "id": card_id,
    "data": card.dict(),
    "embeddings": embeddings
    }

    cards.append(stored_card)
    save_cards()

    return stored_card   



    
@app.get("/cards")
def get_cards():
    return cards

@app.delete("/cards")
def delete_all_cards():
    global cards
    cards = []       
    save_cards()     
    return {"message": "All cards deleted"}
    


