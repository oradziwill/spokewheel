#!/bin/bash
# Script to fix PostgreSQL permissions for SpokeWheel

echo "Fixing PostgreSQL permissions for SpokeWheel..."
echo ""

# Try to connect as the macOS user (superuser) or postgres
# First, try to connect without password (trust authentication)
psql -U aleksandraradziwill -d postgres << 'EOF' 2>/dev/null || psql -U postgres -d postgres << 'EOF' 2>/dev/null || psql -d postgres << 'EOF'
-- Grant permissions to spokewheel_user
\c spokewheel

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO spokewheel_user;
GRANT CREATE ON SCHEMA public TO spokewheel_user;

-- Grant table permissions (for existing tables)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO spokewheel_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO spokewheel_user;

-- Grant default permissions for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO spokewheel_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO spokewheel_user;

-- Make spokewheel_user the owner of the schema (if possible)
-- ALTER SCHEMA public OWNER TO spokewheel_user;

SELECT 'Permissions granted successfully!' as status;
\q
EOF

if [ $? -eq 0 ]; then
    echo "✅ Permissions fixed successfully!"
else
    echo "❌ Could not fix permissions automatically."
    echo ""
    echo "Please run these commands manually as a PostgreSQL superuser:"
    echo ""
    echo "psql -U aleksandraradziwill -d spokewheel"
    echo ""
    echo "Then run:"
    echo "  GRANT ALL ON SCHEMA public TO spokewheel_user;"
    echo "  GRANT CREATE ON SCHEMA public TO spokewheel_user;"
    echo "  GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO spokewheel_user;"
    echo "  GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO spokewheel_user;"
    echo "  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO spokewheel_user;"
    echo "  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO spokewheel_user;"
fi


