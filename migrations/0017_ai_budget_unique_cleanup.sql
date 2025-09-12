-- Deduplicate ai_budget_balance, prefer newest updated_at per (user_id, subscription_id, period_start, period_end)
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, subscription_id, period_start, period_end
           ORDER BY updated_at DESC, created_at DESC
         ) AS rn
  FROM ai_budget_balance
)
DELETE FROM ai_budget_balance b
USING ranked r
WHERE b.id = r.id AND r.rn > 1;

-- Add unique index/constraint to enforce single row per user+subscription+period
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'uniq_ai_budget_period'
  ) THEN
    CREATE UNIQUE INDEX uniq_ai_budget_period
      ON ai_budget_balance (user_id, subscription_id, period_start, period_end);
  END IF;
END $$;


