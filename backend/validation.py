from typing import List
from pydantic import BaseModel


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


class LinkRecord(BaseModel):
    lid: str
    card_a_id: int
    card_b_id: int
    similarity: float
    top3_fields: List[str]
    short_label: str
    reason: str


class GenerateCardResponse(BaseModel):
    card: StoredCard
    links: List[LinkRecord]