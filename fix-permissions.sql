-- Fix PostgreSQL Permissions for SpokeWheel
-- Run this as a PostgreSQL superuser (your macOS user or postgres)

-- Connect to the spokewheel database first
\c spokewheel

-- Grant schema permissions (required for PostgreSQL 15+)
GRANT ALL ON SCHEMA public TO spokewheel_user;
GRANT CREATE ON SCHEMA public TO spokewheel_user;

-- Grant privileges on existing tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO spokewheel_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO spokewheel_user;

-- Grant default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO spokewheel_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO spokewheel_user;

-- Verify permissions
SELECT 'Permissions granted successfully!' as status;


