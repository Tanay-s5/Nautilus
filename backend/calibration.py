from typing import Any, Dict, List, Tuple

import numpy as np
from scipy.optimize import nnls

import database
from embedding import FIELD_NAMES, WEIGHTS


def _batch_size() -> int:
    return database.get_settings()["batch_size"]


def _rows_from_ratings(user_ratings: List[Dict[str, Any]]) -> Tuple[np.ndarray, np.ndarray]:
    X = np.array([[r["field_scores"].get(f, 0.0) for f in FIELD_NAMES] for r in user_ratings])
    y = np.array([r["rating"] / 100.0 for r in user_ratings])
    return X, y


def get_user_weights(user: str) -> Dict[str, float]:
    entry = database.get_user_weights_entry(user)
    return entry["weights"] if entry else dict(WEIGHTS)


def is_personalized(user: str) -> bool:
    return database.get_user_weights_entry(user) is not None


def ratings_since_last_refit(user: str) -> int:
    entry = database.get_user_weights_entry(user)
    total = len(database.get_ratings_for_user(user))
    fit_at = entry["rating_count_at_fit"] if entry else 0
    return total - fit_at


def ratings_until_next_refit(user: str) -> int:
    return max(0, _batch_size() - ratings_since_last_refit(user))


def maybe_refit(user: str) -> bool:
    if ratings_since_last_refit(user) >= _batch_size():
        return refit_weights(user)
    return False


def refit_weights(user: str) -> bool:
    user_ratings = database.get_ratings_for_user(user)
    if len(user_ratings) < _batch_size():
        return False

    X, y = _rows_from_ratings(user_ratings)
    raw_weights, _residual = nnls(X, y)

    if raw_weights.sum() <= 1e-9:
        return False

    weights = {field: float(w) for field, w in zip(FIELD_NAMES, raw_weights)}
    database.save_user_weights(user, weights, rating_count_at_fit=len(user_ratings))
    return True
