-- Add Pro status for thearchitectofthemultiverse
-- Run this in Supabase SQL Editor

-- First, find the user by username/display name
DO $$
DECLARE
    user_record RECORD;
BEGIN
    -- Look for the user by username in raw_user_meta_data
    SELECT id, email, raw_user_meta_data INTO user_record
    FROM auth.users
    WHERE raw_user_meta_data->>'full_name' ILIKE '%thearchitectofthemultiverse%'
       OR raw_user_meta_data->>'name' ILIKE '%thearchitectofthemultiverse%'
       OR raw_user_meta_data->>'custom_claims'->>'global_name' ILIKE '%thearchitectofthemultiverse%'
    LIMIT 1;
    
    IF user_record.id IS NOT NULL THEN
        RAISE NOTICE 'Found user: % with email: %', user_record.id, user_record.email;
    ELSE
        RAISE NOTICE 'User not found by name, check the users table below';
    END IF;
END $$;

-- List all users to find the correct one
SELECT 
    id,
    email,
    raw_user_meta_data->>'full_name' as full_name,
    raw_user_meta_data->>'name' as name,
    created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 20;

-- Once you find the user ID, run this to upgrade them:
-- Replace 'USER_ID_HERE' with the actual user ID from the query above

/*
UPDATE users
SET 
    subscription_tier = 'pro',
    generation_credits = 999999,
    model_credits = 999999
WHERE id = 'USER_ID_HERE'
   OR discord_id = 'USER_ID_HERE';
*/

-- Alternative: Update by email if you know it
/*
UPDATE users
SET 
    subscription_tier = 'pro',
    generation_credits = 999999,
    model_credits = 999999
WHERE email ILIKE '%thearchitectofthemultiverse%';
*/
