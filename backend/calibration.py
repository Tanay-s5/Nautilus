from typing import Dict

import numpy as np
from scipy.optimize import nnls

import database
from embedding import FIELD_NAMES, WEIGHTS


def get_user_weights(user_id) -> Dict[str, float]:
    row = database.get_weights_row(user_id)
    return row["weights"] if row else dict(WEIGHTS)


def is_personalized(user_id) -> bool:
    return database.get_weights_row(user_id) is not None


def _ratings_since_last_refit(user_id) -> int:
    row = database.get_weights_row(user_id)
    fit_at = row["rating_count_at_fit"] if row else 0
    return database.count_ratings(user_id) - fit_at


def ratings_until_next_refit(user_id) -> int:
    return max(0, database.get_batch_size(user_id) - _ratings_since_last_refit(user_id))


def maybe_refit(user_id) -> bool:
    if _ratings_since_last_refit(user_id) >= database.get_batch_size(user_id):
        return refit_weights(user_id)
    return False


def refit_weights(user_id) -> bool:
    user_ratings = database.list_ratings(user_id)
    if len(user_ratings) < database.get_batch_size(user_id):
        return False

    X = np.array([[r["field_scores"].get(f, 0.0) for f in FIELD_NAMES] for r in user_ratings])
    y = np.array([r["rating"] / 100.0 for r in user_ratings])
    raw_weights, _residual = nnls(X, y)

    if raw_weights.sum() <= 1e-9:
        return False

    weights = {field: float(w) for field, w in zip(FIELD_NAMES, raw_weights)}
    database.upsert_weights(user_id, weights, rating_count_at_fit=len(user_ratings))
    return True
