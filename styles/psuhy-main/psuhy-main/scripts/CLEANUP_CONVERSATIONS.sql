-- CLEANUP SCRIPT: Delete empty/orphan conversations
-- Run this in Supabase SQL Editor

-- Step 1: Delete conversations that have no messages OR have title "New Chat" or "New Conversation"
DELETE FROM conversations 
WHERE title IN ('New Chat', 'New Conversation', 'New chat');

-- Step 2: Delete conversations with no messages (orphaned)
DELETE FROM conversations 
WHERE id NOT IN (
    SELECT DISTINCT conversation_id FROM chat_messages WHERE conversation_id IS NOT NULL
);

-- Step 3: Count remaining conversations (should show your real chats)
SELECT COUNT(*) as remaining_conversations FROM conversations;

-- Step 4: Show remaining conversations
SELECT id, title, updated_at FROM conversations ORDER BY updated_at DESC LIMIT 10;
