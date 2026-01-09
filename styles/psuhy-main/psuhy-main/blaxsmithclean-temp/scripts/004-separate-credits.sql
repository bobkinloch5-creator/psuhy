-- Add separate credit fields for different generation types
-- Run this after 003-admin-setup.sql

-- Add new credit columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS model_credits INTEGER DEFAULT 50;
ALTER TABLE users ADD COLUMN IF NOT EXISTS world_credits INTEGER DEFAULT 50;

-- Migrate existing generation_credits to both new fields
UPDATE users SET model_credits = generation_credits, world_credits = generation_credits WHERE model_credits IS NULL;

-- Update reset function to handle separate credits
CREATE OR REPLACE FUNCTION reset_monthly_credits()
RETURNS void AS $$
BEGIN
  -- Free users get 50 model credits and 50 world credits
  UPDATE users SET 
    model_credits = 50,
    world_credits = 50
  WHERE subscription_tier = 'free';
  
  -- Pro users get 500 model credits and 500 world credits
  UPDATE users SET 
    model_credits = 500,
    world_credits = 500
  WHERE subscription_tier = 'pro' AND subscription_status = 'active';
  
  -- Enterprise users get unlimited (9999) for both
  UPDATE users SET 
    model_credits = 9999,
    world_credits = 9999
  WHERE subscription_tier = 'enterprise' AND subscription_status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Update admin trigger to set both credit types
CREATE OR REPLACE FUNCTION set_admin_privileges()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if username is goldbergjoe100 (case insensitive)
  IF LOWER(NEW.username) = 'goldbergjoe100' THEN
    NEW.is_admin = true;
    NEW.generation_credits = 999999;
    NEW.model_credits = 999999;
    NEW.world_credits = 999999;
    NEW.subscription_tier = 'enterprise';
    NEW.subscription_status = 'active';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate triggers with updated function
DROP TRIGGER IF EXISTS admin_check_trigger ON users;
DROP TRIGGER IF EXISTS admin_check_update_trigger ON users;

CREATE TRIGGER admin_check_trigger
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_admin_privileges();

CREATE TRIGGER admin_check_update_trigger
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_admin_privileges();

-- Set goldbergjoe100's credits if they already exist
UPDATE users SET 
  model_credits = 999999,
  world_credits = 999999
WHERE LOWER(username) = 'goldbergjoe100';
