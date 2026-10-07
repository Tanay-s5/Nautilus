import os
from typing import Any, Dict, List, Optional
from uuid import UUID

import numpy as np
from dotenv import load_dotenv
from pgvector.psycopg import register_vector
from psycopg import Connection
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
from psycopg_pool import ConnectionPool

load_dotenv()

DEFAULT_BATCH_SIZE = 20

_pool: Optional[ConnectionPool] = None

#postgres vector->numpy vector
def _configure(conn: Connection) -> None:
    register_vector(conn)


def open_pool(url: Optional[str] = None, min_size: int = 2, max_size: int = 10) -> None:
    global _pool
    url = url or os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is not set (see .env.example)")
    _pool = ConnectionPool(
        url,
        min_size=min_size,
        max_size=max_size,
        kwargs={"row_factory": dict_row},
        configure=_configure,
        open=False,
    )
    _pool.open(wait=True, timeout=30)


def close_pool() -> None:
    global _pool
    if _pool is not None:
        _pool.close()
        _pool = None


def _pool_or_raise() -> ConnectionPool:
    if _pool is None:
        raise RuntimeError("Database pool is not open")
    return _pool


def ping() -> bool:
    with _pool_or_raise().connection() as conn:
        return conn.execute("SELECT 1 AS ok").fetchone()["ok"] == 1


def _touch_user(conn: Connection, user_id: UUID) -> None:
    conn.execute(
        "INSERT INTO users (id) VALUES (%s) "
        "ON CONFLICT (id) DO UPDATE SET last_seen_at = now()",
        (user_id,),
    )






def list_cards(user_id: UUID) -> List[Dict[str, Any]]:
    with _pool_or_raise().connection() as conn:
        return conn.execute(
            "SELECT id, data FROM cards WHERE user_id = %s ORDER BY id", (user_id,)
        ).fetchall()


def get_card(user_id: UUID, card_id: int) -> Optional[Dict[str, Any]]:
    with _pool_or_raise().connection() as conn:
        return conn.execute(
            "SELECT id, data FROM cards WHERE id = %s AND user_id = %s", (card_id, user_id)
        ).fetchone()


def list_card_embeddings(user_id: UUID) -> List[Dict[str, Any]]:
    with _pool_or_raise().connection() as conn:
        rows = conn.execute(
            "SELECT c.id, c.title, e.field_name, e.embedding "
            "FROM cards c JOIN card_embeddings e ON e.card_id = c.id "
            "WHERE c.user_id = %s ORDER BY c.id",
            (user_id,),
        ).fetchall()

    grouped: Dict[int, Dict[str, Any]] = {}
    for row in rows:
        card = grouped.setdefault(
            row["id"], {"id": row["id"], "title": row["title"], "embeddings": {}}
        )
        vec = row["embedding"]

        card["embeddings"][row["field_name"]] = vec.to_numpy() if hasattr(vec, "to_numpy") else np.asarray(vec)
    return list(grouped.values())


def create_card_with_links(
    user_id: UUID,
    card_data: Dict[str, Any],
    embeddings: Dict[str, Any],
    links: List[Dict[str, Any]],) -> int:
   
    with _pool_or_raise().connection() as conn:  
        _touch_user(conn, user_id)
        card_id = conn.execute(
            "INSERT INTO cards (user_id, title, data) VALUES (%s, %s, %s) RETURNING id",
            (user_id, card_data["title"], Jsonb(card_data)),
        ).fetchone()["id"]

        with conn.cursor() as cur:
            cur.executemany(
                "INSERT INTO card_embeddings (card_id, field_name, embedding) VALUES (%s, %s, %s)",
                [
                    (card_id, field, np.asarray(vec, dtype=np.float32))
                    for field, vec in embeddings.items()
                ],
            )
            cur.executemany(
                "INSERT INTO links (user_id, card_a_id, card_b_id, similarity, field_scores, "
                "is_boundary, top3_fields, short_label, reason) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
                [
                    (
                        user_id,
                        min(l["other_card_id"], card_id),
                        max(l["other_card_id"], card_id),
                        l["similarity"],
                        Jsonb(l["field_scores"]),
                        l["is_boundary"],
                        l["top3_fields"],
                        l["short_label"],
                        l["reason"],
                    )
                    for l in links
                ],
            )
    return card_id


def delete_card(user_id: UUID, card_id: int) -> bool:
    with _pool_or_raise().connection() as conn:
        row = conn.execute(
            "DELETE FROM cards WHERE id = %s AND user_id = %s RETURNING id", (card_id, user_id)
        ).fetchone()
    return row is not None


def clear_canvas(user_id: UUID) -> None:
    with _pool_or_raise().connection() as conn:
        conn.execute("DELETE FROM ratings WHERE user_id = %s", (user_id,))
        conn.execute("DELETE FROM cards WHERE user_id = %s", (user_id,))
        conn.execute(
            "UPDATE user_weights SET rating_count_at_fit = 0 WHERE user_id = %s", (user_id,)
        )







_LINK_COLUMNS = (
    "id, card_a_id || ' <-> ' || card_b_id AS lid, card_a_id, card_b_id, similarity, "
    "field_scores, is_boundary, top3_fields, short_label, reason"
)


def list_links(user_id: UUID) -> List[Dict[str, Any]]:
    with _pool_or_raise().connection() as conn:
        return conn.execute(
            f"SELECT {_LINK_COLUMNS} FROM links WHERE user_id = %s ORDER BY similarity DESC",
            (user_id,),
        ).fetchall()


def get_link(user_id: UUID, card_a_id: int, card_b_id: int) -> Optional[Dict[str, Any]]:
    with _pool_or_raise().connection() as conn:
        return conn.execute(
            f"SELECT {_LINK_COLUMNS} FROM links "
            "WHERE user_id = %s AND card_a_id = %s AND card_b_id = %s",
            (user_id, card_a_id, card_b_id),
        ).fetchone()


def list_link_candidates(user_id: UUID, threshold: float, limit: int) -> List[Dict[str, Any]]:
    with _pool_or_raise().connection() as conn:
        return conn.execute(
            f"SELECT {_LINK_COLUMNS} FROM links l "
            "WHERE l.user_id = %s AND NOT EXISTS ("
            "  SELECT 1 FROM ratings r WHERE r.user_id = l.user_id "
            "  AND r.card_a_id = l.card_a_id AND r.card_b_id = l.card_b_id) "
            "ORDER BY abs(l.similarity - %s) LIMIT %s",
            (user_id, threshold, limit),
        ).fetchall()








def upsert_rating(user_id: UUID, link: Dict[str, Any], rating: int) -> None:
    with _pool_or_raise().connection() as conn:
        _touch_user(conn, user_id)
        conn.execute(
            "INSERT INTO ratings (user_id, link_id, card_a_id, card_b_id, rating, field_scores) "
            "VALUES (%s, %s, %s, %s, %s, %s) "
            "ON CONFLICT (user_id, card_a_id, card_b_id) DO UPDATE SET "
            "link_id = EXCLUDED.link_id, rating = EXCLUDED.rating, "
            "field_scores = EXCLUDED.field_scores, updated_at = now()",
            (
                user_id,
                link["id"],
                link["card_a_id"],
                link["card_b_id"],
                rating,
                Jsonb(link["field_scores"]),
            ),
        )


def count_ratings(user_id: UUID) -> int:
    with _pool_or_raise().connection() as conn:
        return conn.execute(
            "SELECT count(*) AS n FROM ratings WHERE user_id = %s", (user_id,)
        ).fetchone()["n"]


def list_ratings(user_id: UUID) -> List[Dict[str, Any]]:
    with _pool_or_raise().connection() as conn:
        return conn.execute(
            "SELECT rating, field_scores FROM ratings WHERE user_id = %s ORDER BY id", (user_id,)
        ).fetchall()







def get_weights_row(user_id: UUID) -> Optional[Dict[str, Any]]:
    with _pool_or_raise().connection() as conn:
        return conn.execute(
            "SELECT weights, rating_count_at_fit FROM user_weights WHERE user_id = %s", (user_id,)
        ).fetchone()


def upsert_weights(user_id: UUID, weights: Dict[str, float], rating_count_at_fit: int) -> None:
    with _pool_or_raise().connection() as conn:
        _touch_user(conn, user_id)
        conn.execute(
            "INSERT INTO user_weights (user_id, weights, rating_count_at_fit) VALUES (%s, %s, %s) "
            "ON CONFLICT (user_id) DO UPDATE SET weights = EXCLUDED.weights, "
            "rating_count_at_fit = EXCLUDED.rating_count_at_fit, updated_at = now()",
            (user_id, Jsonb(weights), rating_count_at_fit),
        )


def get_batch_size(user_id: UUID) -> int:
    with _pool_or_raise().connection() as conn:
        row = conn.execute("SELECT batch_size FROM users WHERE id = %s", (user_id,)).fetchone()
    return row["batch_size"] if row else DEFAULT_BATCH_SIZE


def set_batch_size(user_id: UUID, batch_size: int) -> int:
    with _pool_or_raise().connection() as conn:
        return conn.execute(
            "INSERT INTO users (id, batch_size) VALUES (%s, %s) "
            "ON CONFLICT (id) DO UPDATE SET batch_size = EXCLUDED.batch_size, last_seen_at = now() "
            "RETURNING batch_size",
            (user_id, batch_size),
        ).fetchone()["batch_size"]
