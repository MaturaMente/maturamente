-- Add active field to users table to support soft deletion
-- This prevents users from repeatedly creating and deleting free trial accounts

-- Add active flag to mark if a user account is active (default: true)
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;

-- Set all existing users to active (backfill)
UPDATE "user" SET active = TRUE WHERE active IS NULL;
