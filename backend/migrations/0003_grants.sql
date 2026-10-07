-- Least privilege (D4): the app role can read and write rows but cannot create, alter or drop
-- anything. The role itself is created by migrate.py (it needs the password from the environment).

GRANT USAGE ON SCHEMA public TO nautilus_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO nautilus_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO nautilus_app;

-- Tables added by future migrations get the same rights automatically.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO nautilus_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO nautilus_app;

-- The migration bookkeeping table is the owner's business only.
REVOKE ALL ON schema_migrations FROM nautilus_app;
