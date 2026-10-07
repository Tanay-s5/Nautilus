from typing import Dict, List, Optional
from pydantic import BaseModel, Field


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
    field_scores: Dict[str, float]
    is_boundary: bool
    top3_fields: List[str]
    short_label: str
    reason: str


class LinkRecordPersonalized(LinkRecord):
    user_similarity: float


class GenerateCardResponse(BaseModel):
    card: StoredCard
    links: List[LinkRecord]


class RatingRequest(BaseModel):
    lid: str
    rating: float = Field(ge=0, le=100)


class SettingsUpdate(BaseModel):
    batch_size: Optional[int] = Field(default=None, ge=1)
