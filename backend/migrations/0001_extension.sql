-- pgvector: adds the `vector(n)` column type. Enabled once per database.
-- Needs superuser-or-trusted-extension rights, which is why migrations run as the owner role.
CREATE EXTENSION IF NOT EXISTS vector;
