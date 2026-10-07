-- Core schema. See Part 4 of the decision guide for the reasoning behind every line.
-- Every row a visitor creates hangs off users(id); every query in database.py filters on user_id.

CREATE TABLE users (
    id           uuid PRIMARY KEY,
    batch_size   integer     NOT NULL DEFAULT 20 CHECK (batch_size >= 1),
    created_at   timestamptz NOT NULL DEFAULT now(),
    last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE cards (
    id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id    uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title      text        NOT NULL,
    data       jsonb       NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cards_user_id_idx ON cards (user_id);

CREATE TABLE card_embeddings (
    card_id    bigint NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    field_name text   NOT NULL CHECK (field_name IN (
        'applications', 'analogy', 'corePrinciples', 'mechanism', 'examples',
        'misconceptions', 'constraints', 'problemPatterns', 'formalStructure')),
    embedding  vector(384) NOT NULL,
    PRIMARY KEY (card_id, field_name)
);

CREATE TABLE links (
    id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id      uuid             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    card_a_id    bigint           NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    card_b_id    bigint           NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    similarity   double precision NOT NULL,
    field_scores jsonb            NOT NULL,
    is_boundary  boolean          NOT NULL,
    top3_fields  text[]           NOT NULL,
    short_label  text             NOT NULL,
    reason       text             NOT NULL,
    created_at   timestamptz      NOT NULL DEFAULT now(),
    CHECK (card_a_id < card_b_id),
    UNIQUE (card_a_id, card_b_id)
);
CREATE INDEX links_user_id_idx   ON links (user_id);
CREATE INDEX links_card_b_id_idx ON links (card_b_id);

-- Ratings are training data for the NNLS refit, so they keep their own snapshot of the
-- field scores and survive card/link deletion (link_id -> NULL). card_a_id/card_b_id have
-- no foreign key on purpose: they identify the judged pair after the cards are gone.
CREATE TABLE ratings (
    id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id      uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    link_id      bigint      REFERENCES links(id) ON DELETE SET NULL,
    card_a_id    bigint      NOT NULL,
    card_b_id    bigint      NOT NULL,
    rating       smallint    NOT NULL CHECK (rating BETWEEN 0 AND 100),
    field_scores jsonb       NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, card_a_id, card_b_id)
);
CREATE INDEX ratings_link_id_idx ON ratings (link_id);

CREATE TABLE user_weights (
    user_id             uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    weights             jsonb       NOT NULL,
    rating_count_at_fit integer     NOT NULL CHECK (rating_count_at_fit >= 0),
    updated_at          timestamptz NOT NULL DEFAULT now()
);
