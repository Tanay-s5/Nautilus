from typing import Dict, List

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


def compute_similarity(e1: dict, e2: dict) -> float:
    total_weight = sum(WEIGHTS.values()) or 1.0
    score = sum(
        weight * cosine_similarity(e1[field], e2[field])
        for field, weight in WEIGHTS.items()
    )
    return float(score / total_weight)


def top_contributing_fields(e1: dict, e2: dict, n: int = 3) -> List[str]:
    contributions = {
        field: weight * cosine_similarity(e1[field], e2[field])
        for field, weight in WEIGHTS.items()
    }
    return sorted(contributions, key=contributions.get, reverse=True)[:n]