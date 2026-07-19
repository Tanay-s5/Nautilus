import json
import os
from typing import Any, Dict, List, Optional

from pathlib import Path

BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)


DB_FILE = DATA_DIR / "cards.json"
LINKS_FILE = DATA_DIR / "links.json"


cards: List[Dict[str, Any]] = []
next_id: int = 0
links: List[Dict[str, Any]] = []


def load_cards() -> None:
    global cards, next_id
    if os.path.exists(DB_FILE):
        with open(DB_FILE, "r") as f:
            cards = json.load(f)
    next_id = max((c["id"] for c in cards), default=-1) + 1


def save_cards() -> None:
    with open(DB_FILE, "w") as f:
        json.dump(cards, f, indent=2)


def load_links() -> None:
    global links
    if os.path.exists(LINKS_FILE):
        with open(LINKS_FILE, "r") as f:
            links = json.load(f)


def save_links() -> None:
    with open(LINKS_FILE, "w") as f:
        json.dump(links, f, indent=2)


def get_all_cards() -> List[Dict[str, Any]]:
    return cards


def get_card_by_id(card_id: int) -> Optional[Dict[str, Any]]:
    for c in cards:
        if c["id"] == card_id:
            return c
    return None


def get_all_links() -> List[Dict[str, Any]]:
    return links


def get_next_id() -> int:
    global next_id
    current = next_id
    next_id += 1
    return current


def add_card(card: Dict[str, Any]) -> None:
    cards.append(card)
    save_cards()


def add_links(new_links: List[Dict[str, Any]]) -> None:
    links.extend(new_links)
    save_links()


def remove_card(card_id: int) -> bool:
    global links
    for c in cards:
        if c["id"] == card_id:
            cards.remove(c)
            links = [l for l in links if l["card_a_id"] != card_id and l["card_b_id"] != card_id]
            save_cards()
            save_links()
            return True
    return False


def clear_cards() -> None:
    global cards, next_id, links
    cards = []
    next_id = 0
    links = []
    save_cards()
    save_links()


load_cards()
load_links()