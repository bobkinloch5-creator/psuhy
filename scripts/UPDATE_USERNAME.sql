-- Update username from goldbergjoe100 to lucas200z
-- Run this in Supabase SQL Editor

UPDATE users 
SET username = 'lucas200z' 
WHERE username = 'goldbergjoe100';

-- Verify the update
SELECT id, username, is_admin, subscription_tier 
FROM users 
WHERE username = 'lucas200z';
