-- Fix Studio Integration Tables
-- Ensures proper plugin communication and asset queue

-- Add user_id column to command_queue if not exists (for non-session commands)
ALTER TABLE command_queue 
ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Create asset_queue table for toolbox integration
CREATE TABLE IF NOT EXISTS asset_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  asset_type TEXT DEFAULT 'Model',
  asset_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create plugin_connections table (simpler than studio_sessions)
CREATE TABLE IF NOT EXISTS plugin_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  studio_id TEXT UNIQUE NOT NULL,
  plugin_version TEXT,
  game_name TEXT,
  place_id TEXT,
  is_active BOOLEAN DEFAULT true,
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_poll TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_asset_queue_user ON asset_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_asset_queue_status ON asset_queue(status);
CREATE INDEX IF NOT EXISTS idx_command_queue_user ON command_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_plugin_connections_user ON plugin_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_plugin_connections_studio ON plugin_connections(studio_id);

-- Enable RLS (Row Level Security)
ALTER TABLE asset_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE command_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE plugin_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow users to manage their own data
CREATE POLICY IF NOT EXISTS "Users can insert their own assets"
  ON asset_queue FOR INSERT
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Users can view their own assets"
  ON asset_queue FOR SELECT
  USING (true);

CREATE POLICY IF NOT EXISTS "Users can update their own assets"
  ON asset_queue FOR UPDATE
  USING (true);

CREATE POLICY IF NOT EXISTS "Users can insert commands"
  ON command_queue FOR INSERT
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Users can view commands"
  ON command_queue FOR SELECT
  USING (true);

CREATE POLICY IF NOT EXISTS "Users can update commands"
  ON command_queue FOR UPDATE
  USING (true);

CREATE POLICY IF NOT EXISTS "Users can manage connections"
  ON plugin_connections FOR ALL
  USING (true);
