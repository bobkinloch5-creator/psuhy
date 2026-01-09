-- Subscription System with Monthly Credit Limits
-- This adds tier-based credit tracking with monthly resets

-- Add monthly credit columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_ai_credits INTEGER DEFAULT 50;
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_model_credits INTEGER DEFAULT 5;
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_world_credits INTEGER DEFAULT 2;
ALTER TABLE users ADD COLUMN IF NOT EXISTS credits_reset_at TIMESTAMP DEFAULT (NOW() + INTERVAL '30 days');

-- Update subscription_tier to use 'free' and 'pro' instead of old tiers
UPDATE users SET subscription_tier = 'free' WHERE subscription_tier IS NULL OR subscription_tier = 'standard';
UPDATE users SET subscription_tier = 'pro' WHERE subscription_tier = 'premium' OR subscription_tier = 'masterforge';

-- Set default values based on tier
UPDATE users 
SET 
  monthly_ai_credits = CASE 
    WHEN subscription_tier = 'pro' THEN 100
    ELSE 50
  END,
  monthly_model_credits = CASE 
    WHEN subscription_tier = 'pro' THEN 50
    ELSE 5
  END,
  monthly_world_credits = CASE 
    WHEN subscription_tier = 'pro' THEN 20
    ELSE 2
  END,
  credits_reset_at = NOW() + INTERVAL '30 days'
WHERE credits_reset_at IS NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_credits_reset ON users(credits_reset_at);

-- Function to reset monthly credits (can be called by cron job)
CREATE OR REPLACE FUNCTION reset_monthly_credits()
RETURNS void AS $$
BEGIN
  UPDATE users
  SET 
    monthly_ai_credits = CASE 
      WHEN subscription_tier = 'pro' THEN 100
      ELSE 50
    END,
    monthly_model_credits = CASE 
      WHEN subscription_tier = 'pro' THEN 50
      ELSE 5
    END,
    monthly_world_credits = CASE 
      WHEN subscription_tier = 'pro' THEN 20
      ELSE 2
    END,
    credits_reset_at = NOW() + INTERVAL '30 days'
  WHERE credits_reset_at <= NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a comment to track this migration
COMMENT ON COLUMN users.monthly_ai_credits IS 'Monthly AI chat prompt credits';
COMMENT ON COLUMN users.monthly_model_credits IS 'Monthly model generation credits';
COMMENT ON COLUMN users.monthly_world_credits IS 'Monthly world generation credits';
COMMENT ON COLUMN users.credits_reset_at IS 'Timestamp when credits will reset';
