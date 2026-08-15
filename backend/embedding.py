from typing import Dict, List, Optional

import numpy as np
import torch
from sentence_transformers import SentenceTransformer

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


def embed_card_fields(card_data: dict) -> dict:
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


def cosine_similarity(a, b) -> float:
    a = np.array(a)
    b = np.array(b)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


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


FIELD_NAMES: List[str] = sorted(WEIGHTS.keys())

LINK_THRESHOLD = 0.4


BOUNDARY_BAND = 0.3


def field_cosine_scores(e1: dict, e2: dict) -> Dict[str, float]:

    return {field: cosine_similarity(e1[field], e2[field]) for field in WEIGHTS}


def default_score(field_scores: Dict[str, float]) -> float:

    total = sum(WEIGHTS.values()) or 1.0
    score = sum(WEIGHTS[field] * v for field, v in field_scores.items())
    return float(score / total)


def personalized_score(field_scores: Dict[str, float], weights: Dict[str, float]) -> float:

    return float(sum(weights.get(field, 0.0) * v for field, v in field_scores.items()))


def top_contributing_fields(
    field_scores: Dict[str, float],
    weights: Optional[Dict[str, float]] = None,
    n: int = 3,
) -> List[str]:
    weights = weights or WEIGHTS
    contributions = {field: weights.get(field, 0.0) * v for field, v in field_scores.items()}
    return sorted(contributions, key=contributions.get, reverse=True)[:n]