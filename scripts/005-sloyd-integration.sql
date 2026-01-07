-- Add Sloyd API integration fields
-- Run this after 004-separate-credits.sql

-- Add Sloyd configuration to users table (admin only)
ALTER TABLE users ADD COLUMN IF NOT EXISTS sloyd_api_key TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sloyd_refresh_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sloyd_enabled BOOLEAN DEFAULT false;

-- Create table for storing Sloyd-generated models
CREATE TABLE IF NOT EXISTS sloyd_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  sloyd_model_id TEXT,
  preview_url TEXT,
  download_url TEXT,
  mesh_data JSONB,
  status TEXT DEFAULT 'generating' CHECK (status IN ('generating', 'ready', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_sloyd_models_user ON sloyd_models(user_id);
CREATE INDEX IF NOT EXISTS idx_sloyd_models_status ON sloyd_models(status);

-- Comment explaining Sloyd integration
COMMENT ON COLUMN users.sloyd_api_key IS 'Admin Sloyd API key - shared across all users for 3D model generation';
COMMENT ON TABLE sloyd_models IS 'Generated 3D models from Sloyd AI - includes preview and download URLs';
