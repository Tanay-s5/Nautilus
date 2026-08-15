import json
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set

from pathlib import Path

BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)


DB_FILE = DATA_DIR / "cards.json"
LINKS_FILE = DATA_DIR / "links.json"
RATINGS_FILE = DATA_DIR / "ratings.json"
WEIGHTS_FILE = DATA_DIR / "weights.json"
SETTINGS_FILE = DATA_DIR / "settings.json"

DEFAULT_SETTINGS: Dict[str, Any] = {
    "batch_size": 20,
}

cards: List[Dict[str, Any]] = []
next_id: int = 0
links: List[Dict[str, Any]] = []
ratings: List[Dict[str, Any]] = []
next_rating_id: int = 0
user_weights: Dict[str, Dict[str, Any]] = {}
settings: Dict[str, Any] = dict(DEFAULT_SETTINGS)


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
    _backfill_field_scores()


def _backfill_field_scores() -> None:
    from embedding import BOUNDARY_BAND, LINK_THRESHOLD, field_cosine_scores

    changed = False
    for link in links:
        if "field_scores" not in link:
            card_a = get_card_by_id(link["card_a_id"])
            card_b = get_card_by_id(link["card_b_id"])
            link["field_scores"] = (
                field_cosine_scores(card_a["embeddings"], card_b["embeddings"])
                if card_a and card_b
                else {}
            )
            changed = True
        if "is_boundary" not in link:
            link["is_boundary"] = link["similarity"] <= LINK_THRESHOLD + BOUNDARY_BAND
            changed = True
    if changed:
        save_links()


def save_links() -> None:
    with open(LINKS_FILE, "w") as f:
        json.dump(links, f, indent=2)


def load_ratings() -> None:
    global ratings, next_rating_id
    if os.path.exists(RATINGS_FILE):
        with open(RATINGS_FILE, "r") as f:
            ratings = json.load(f)
    next_rating_id = max((r["id"] for r in ratings), default=-1) + 1


def save_ratings() -> None:
    with open(RATINGS_FILE, "w") as f:
        json.dump(ratings, f, indent=2)


def load_user_weights() -> None:
    global user_weights
    if os.path.exists(WEIGHTS_FILE):
        with open(WEIGHTS_FILE, "r") as f:
            user_weights = json.load(f)


def save_user_weights_file() -> None:
    with open(WEIGHTS_FILE, "w") as f:
        json.dump(user_weights, f, indent=2)


def load_settings() -> None:
    global settings
    if os.path.exists(SETTINGS_FILE):
        with open(SETTINGS_FILE, "r") as f:
            settings = {**DEFAULT_SETTINGS, **json.load(f)}


def save_settings() -> None:
    with open(SETTINGS_FILE, "w") as f:
        json.dump(settings, f, indent=2)


def get_all_cards() -> List[Dict[str, Any]]:
    return cards


def get_card_by_id(card_id: int) -> Optional[Dict[str, Any]]:
    for c in cards:
        if c["id"] == card_id:
            return c
    return None


def get_all_links() -> List[Dict[str, Any]]:
    return links


def get_link_by_id(lid: str) -> Optional[Dict[str, Any]]:
    for l in links:
        if l["lid"] == lid:
            return l
    return None


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


def clear_canvas_data() -> None:
    global cards, next_id, links, ratings, next_rating_id
    cards = []
    next_id = 0
    links = []
    ratings = []
    next_rating_id = 0
    save_cards()
    save_links()
    save_ratings()

    for entry in user_weights.values():
        entry["rating_count_at_fit"] = 0
    if user_weights:
        save_user_weights_file()


def get_next_rating_id() -> int:
    global next_rating_id
    current = next_rating_id
    next_rating_id += 1
    return current


def add_rating(rating: Dict[str, Any]) -> None:
    for i, r in enumerate(ratings):
        if r["user"] == rating["user"] and r["lid"] == rating["lid"]:
            rating["id"] = r["id"]
            ratings[i] = rating
            save_ratings()
            return
    ratings.append(rating)
    save_ratings()


def get_ratings_for_user(user: str) -> List[Dict[str, Any]]:
    return [r for r in ratings if r["user"] == user]


def get_rated_lids_for_user(user: str) -> Set[str]:
    return {r["lid"] for r in ratings if r["user"] == user}


def get_user_weights_entry(user: str) -> Optional[Dict[str, Any]]:
    return user_weights.get(user)


def save_user_weights(user: str, weights: Dict[str, float], rating_count_at_fit: int) -> None:
    user_weights[user] = {
        "weights": weights,
        "rating_count_at_fit": rating_count_at_fit,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    save_user_weights_file()


def get_settings() -> Dict[str, Any]:
    return settings


def update_settings(patch: Dict[str, Any]) -> Dict[str, Any]:
    settings.update({k: v for k, v in patch.items() if v is not None})
    save_settings()
    return settings


load_cards()
load_links()
load_ratings()
load_user_weights()
load_settings()
