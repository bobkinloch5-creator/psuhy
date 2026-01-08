-- Make Partner (Discord ID: 607677349718261783) an Admin with Unlimited Credits
-- Run this in Supabase SQL Editor

-- First, update any existing user with this Discord ID
UPDATE users 
SET 
  is_admin = true,
  generation_credits = 999999999,
  model_credits = 999999999,
  world_credits = 999999999,
  subscription_tier = 'enterprise',
  subscription_status = 'active'
WHERE discord_id = '607677349718261783';

-- If user doesn't exist yet, the trigger below will set them up on first login

-- Update the admin check function to also recognize your partner's Discord ID
CREATE OR REPLACE FUNCTION set_admin_privileges()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if username is goldbergjoe100 (case insensitive) or if discord_id matches partner
  IF LOWER(NEW.username) = 'goldbergjoe100' OR NEW.discord_id = '607677349718261783' THEN
    NEW.is_admin = true;
    NEW.generation_credits = 999999999;
    NEW.model_credits = 999999999;
    NEW.world_credits = 999999999;
    NEW.subscription_tier = 'enterprise';
    NEW.subscription_status = 'active';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verify the update worked (check results)
SELECT id, username, discord_id, is_admin, generation_credits, model_credits, world_credits, subscription_tier, subscription_status 
FROM users 
WHERE discord_id = '607677349718261783' OR is_admin = true;
