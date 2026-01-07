-- Add admin role to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Set goldbergjoe100 as admin and give infinite credits
-- This will execute when the user logs in for the first time
CREATE OR REPLACE FUNCTION set_admin_privileges()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if username is goldbergjoe100 (case insensitive)
  IF LOWER(NEW.username) = 'goldbergjoe100' THEN
    NEW.is_admin = true;
    NEW.generation_credits = 999999;
    NEW.subscription_tier = 'enterprise';
    NEW.subscription_status = 'active';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set admin on insert
DROP TRIGGER IF EXISTS admin_check_trigger ON users;
CREATE TRIGGER admin_check_trigger
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_admin_privileges();

-- Also create trigger for updates in case username changes
DROP TRIGGER IF EXISTS admin_check_update_trigger ON users;
CREATE TRIGGER admin_check_update_trigger
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_admin_privileges();

-- Update existing user if they exist
UPDATE users 
SET is_admin = true, 
    generation_credits = 999999, 
    subscription_tier = 'enterprise',
    subscription_status = 'active'
WHERE LOWER(username) = 'goldbergjoe100';
