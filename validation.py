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


class CardLink(BaseModel):
    id: int
    title: str
    score: float


class StoredCard(BaseModel):
    id: int
    data: Card
    links: List[CardLink] = []