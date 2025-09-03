-- Add monthly_ai_budget to subscriptions table
ALTER TABLE subscriptions ADD COLUMN monthly_ai_budget DECIMAL(10,4) NOT NULL DEFAULT '0';

-- Create ai_usage table for detailed tracking
CREATE TABLE ai_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    input_cost_usd DECIMAL(10,8) NOT NULL DEFAULT '0',
    output_cost_usd DECIMAL(10,8) NOT NULL DEFAULT '0',
    total_cost_usd DECIMAL(10,8) NOT NULL DEFAULT '0',
    chat_type TEXT NOT NULL CHECK (chat_type IN ('pdf', 'subject', 'dashboard')),
    model_used TEXT NOT NULL DEFAULT 'deepseek-chat',
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Create ai_budget_balance table for monthly budget tracking
CREATE TABLE ai_budget_balance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    allocated_budget_eur DECIMAL(10,4) NOT NULL,
    used_budget_usd DECIMAL(10,8) NOT NULL DEFAULT '0',
    remaining_budget_eur DECIMAL(10,4) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_ai_usage_user_id ON ai_usage(user_id);
CREATE INDEX idx_ai_usage_created_at ON ai_usage(created_at);
CREATE INDEX idx_ai_usage_subscription_id ON ai_usage(subscription_id);
CREATE INDEX idx_ai_budget_balance_user_id ON ai_budget_balance(user_id);
CREATE INDEX idx_ai_budget_balance_period ON ai_budget_balance(period_start, period_end);
CREATE INDEX idx_ai_budget_balance_subscription_id ON ai_budget_balance(subscription_id);

-- Update existing active subscriptions with AI budget (25% of custom_price)
UPDATE subscriptions 
SET monthly_ai_budget = CAST(custom_price AS DECIMAL(10,4)) * 0.25
WHERE status = 'active' AND custom_price IS NOT NULL;
