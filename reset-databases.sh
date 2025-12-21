#!/bin/bash
# Script to reset databases for new column names

echo "⚠️  WARNING: This will DROP all existing data!"
echo "Press Ctrl+C to cancel, or Enter to continue..."
read

DB_TYPE=${DB_TYPE:-sqlite}

if [ "$DB_TYPE" = "postgresql" ]; then
  echo "Resetting PostgreSQL database..."
  PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "DROP TABLE IF EXISTS admin_feedback_results CASCADE;"
  echo "PostgreSQL tables dropped. Restart the server to recreate with new schema."
else
  echo "Resetting SQLite database..."
  rm -f admin_feedback.db
  echo "SQLite database deleted. Restart the server to recreate with new schema."
fi

echo "✅ Database reset complete!"
