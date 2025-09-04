-- Free trial support: add is_free_trial to subscriptions and free_trial flag to notes

-- Add flag to mark a subscription as a free trial
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS is_free_trial BOOLEAN NOT NULL DEFAULT FALSE;

-- Add flag on notes to mark which ones are available in free trial
ALTER TABLE notes ADD COLUMN IF NOT EXISTS free_trial BOOLEAN NOT NULL DEFAULT FALSE;

-- Optional: backfill defaults (no-op since defaults are defined)


