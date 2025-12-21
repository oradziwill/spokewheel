-- SQL script to reset admin_feedback_results table on Railway
-- Run this in Railway PostgreSQL console or via psql
-- 
-- To use:
-- 1. In Railway dashboard → PostgreSQL service → "Connect"
-- 2. Copy the connection string or use Railway CLI: railway connect postgresql
-- 3. Run: psql $DATABASE_URL -f reset-table-sql.sql
--    OR paste this SQL into Railway's PostgreSQL console

-- Drop the table (this will delete all feedback data)
DROP TABLE IF EXISTS admin_feedback_results CASCADE;

-- The server will automatically recreate the table with the new schema
-- when it starts up. New columns will be:
-- asking, chaos, positive-fbck, listening, macro-mgmt, visioneering, 1on1, synchronous, pro-motion, adaptive, care

-- Verify the table was dropped
SELECT 'Table dropped successfully. Restart your Railway service to recreate it.' as status;

