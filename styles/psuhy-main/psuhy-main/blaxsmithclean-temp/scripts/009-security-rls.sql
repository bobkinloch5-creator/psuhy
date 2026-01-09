-- Row Level Security Policies
-- CRITICAL: Run this immediately to secure your database

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE creations ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE roblox_assets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can view own creations" ON creations;
DROP POLICY IF EXISTS "Users can create own creations" ON creations;
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can create own projects" ON projects;
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view own messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can create own messages" ON chat_messages;

-- Users policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::text = discord_id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = discord_id);

-- Creations policies
CREATE POLICY "Users can view own creations" ON creations
  FOR SELECT USING (user_id IN (
    SELECT id FROM users WHERE discord_id = auth.uid()::text
  ));

CREATE POLICY "Users can create own creations" ON creations
  FOR INSERT WITH CHECK (user_id IN (
    SELECT id FROM users WHERE discord_id = auth.uid()::text
  ));

CREATE POLICY "Users can update own creations" ON creations
  FOR UPDATE USING (user_id IN (
    SELECT id FROM users WHERE discord_id = auth.uid()::text
  ));

-- Projects policies
CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (user_id IN (
    SELECT id FROM users WHERE discord_id = auth.uid()::text
  ));

CREATE POLICY "Users can create own projects" ON projects
  FOR INSERT WITH CHECK (user_id IN (
    SELECT id FROM users WHERE discord_id = auth.uid()::text
  ));

CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (user_id IN (
    SELECT id FROM users WHERE discord_id = auth.uid()::text
  ));

-- Conversations policies
CREATE POLICY "Users can view own conversations" ON conversations
  FOR SELECT USING (user_id IN (
    SELECT id FROM users WHERE discord_id = auth.uid()::text
  ));

CREATE POLICY "Users can create own conversations" ON conversations
  FOR INSERT WITH CHECK (user_id IN (
    SELECT id FROM users WHERE discord_id = auth.uid()::text
  ));

-- Chat messages policies  
CREATE POLICY "Users can view own messages" ON chat_messages
  FOR SELECT USING (conversation_id IN (
    SELECT id FROM conversations WHERE user_id IN (
      SELECT id FROM users WHERE discord_id = auth.uid()::text
    )
  ));

CREATE POLICY "Users can create own messages" ON chat_messages
  FOR INSERT WITH CHECK (conversation_id IN (
    SELECT id FROM conversations WHERE user_id IN (
      SELECT id FROM users WHERE discord_id = auth.uid()::text
    )
  ));

-- File attachments inherit conversation permissions
CREATE POLICY "Users can view own attachments" ON file_attachments
  FOR SELECT USING (conversation_id IN (
    SELECT id FROM conversations WHERE user_id IN (
      SELECT id FROM users WHERE discord_id = auth.uid()::text
    )
  ));

-- Model files policies
CREATE POLICY "Users can view own model files" ON model_files
  FOR SELECT USING (user_id IN (
    SELECT id FROM users WHERE discord_id = auth.uid()::text
  ));

CREATE POLICY "Users can create own model files" ON model_files
  FOR INSERT WITH CHECK (user_id IN (
    SELECT id FROM users WHERE discord_id = auth.uid()::text
  ));

-- Roblox assets policies
CREATE POLICY "Users can view own roblox assets" ON roblox_assets
  FOR SELECT USING (user_id IN (
    SELECT id FROM users WHERE discord_id = auth.uid()::text
  ));

CREATE POLICY "Users can create own roblox assets" ON roblox_assets
  FOR INSERT WITH CHECK (user_id IN (
    SELECT id FROM users WHERE discord_id = auth.uid()::text
  ));
