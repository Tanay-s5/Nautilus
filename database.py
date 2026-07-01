import json
import os
from typing import Any, Dict, List, Optional

DB_FILE = "cards.json"

cards: List[Dict[str, Any]] = []
next_id: int = 0


def load_cards() -> None:
    global cards, next_id
    if os.path.exists(DB_FILE):
        with open(DB_FILE, "r") as f:
            cards = json.load(f)
    next_id = max((c["id"] for c in cards), default=-1) + 1


def save_cards() -> None:
    with open(DB_FILE, "w") as f:
        json.dump(cards, f, indent=2)


def get_all_cards() -> List[Dict[str, Any]]:
    return cards


def get_card_by_id(card_id: int) -> Optional[Dict[str, Any]]:
    for c in cards:
        if c["id"] == card_id:
            return c
    return None


def get_next_id() -> int:
    global next_id
    current = next_id
    next_id += 1
    return current


def add_card(card: Dict[str, Any]) -> None:
    cards.append(card)
    save_cards()


def remove_card(card_id: int) -> bool:
    for c in cards:
        if c["id"] == card_id:
            cards.remove(c)
            save_cards()
            return True
    return False


def clear_cards() -> None:
    global cards, next_id
    cards = []
    next_id = 0
    save_cards()


load_cards()