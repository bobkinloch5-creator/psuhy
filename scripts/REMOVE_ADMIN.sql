-- Remove thearchitectofthemultiverse from admin
-- Run this in Supabase SQL Editor

UPDATE users 
SET is_admin = false 
WHERE username = 'thearchitectofthemultiverse';

-- Verify the change
SELECT id, username, is_admin 
FROM users 
WHERE username = 'thearchitectofthemultiverse';
