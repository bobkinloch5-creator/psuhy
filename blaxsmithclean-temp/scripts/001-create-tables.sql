-- BlaxSmith Database Schema
-- Users, Creations, and Studio Sessions

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (Discord OAuth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  discord_id TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  avatar TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  generation_credits INTEGER DEFAULT 50
);

-- Creations table (Models, Worlds, Scripts)
CREATE TABLE IF NOT EXISTS creations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('model', 'world', 'script', 'system')),
  name TEXT NOT NULL,
  description TEXT,
  prompt TEXT NOT NULL,
  preview_url TEXT,
  asset_data JSONB,
  status TEXT DEFAULT 'generating' CHECK (status IN ('generating', 'ready', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Studio sessions table (Roblox Studio connections)
CREATE TABLE IF NOT EXISTS studio_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  studio_id TEXT NOT NULL,
  plugin_version TEXT,
  game_name TEXT,
  place_id TEXT,
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_poll TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Command queue table (Plugin polling)
CREATE TABLE IF NOT EXISTS command_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES studio_sessions(id) ON DELETE CASCADE,
  command_type TEXT NOT NULL,
  command_data JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  executed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_discord ON users(discord_id);
CREATE INDEX IF NOT EXISTS idx_creations_user ON creations(user_id);
CREATE INDEX IF NOT EXISTS idx_creations_type ON creations(type);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON studio_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_commands_session ON command_queue(session_id);
CREATE INDEX IF NOT EXISTS idx_commands_status ON command_queue(status);
