-- RUN THIS IN SUPABASE SQL EDITOR TO FIX CREDIT PERSISTENCE
-- This removes the trigger that keeps resetting your credits to 999999999

-- Step 1: Drop the problematic triggers
DROP TRIGGER IF EXISTS set_admin_credits_trigger ON users;
DROP FUNCTION IF EXISTS set_admin_credits();

-- Step 2: Verify your current credits (check what they are now)
SELECT id, username, email, generation_credits, model_credits, world_credits, subscription_tier, is_admin
FROM users 
WHERE email LIKE '%bobkinloch%' OR username = 'goldbergjoe100';

-- Step 3: Set your credits to what you want (update these numbers as needed)
UPDATE users 
SET generation_credits = 99999998,
    model_credits = 999999999,
    world_credits = 999999999
WHERE email LIKE '%bobkinloch%' OR username = 'goldbergjoe100';

-- Step 4: Verify the update worked
SELECT id, username, generation_credits, model_credits, world_credits
FROM users 
WHERE email LIKE '%bobkinloch%' OR username = 'goldbergjoe100';
