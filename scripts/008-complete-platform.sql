-- Complete Platform Database Schema
-- Chat, Projects, Model Files, and Roblox Integration
-- Run this as migration 008

-- File attachments for AI chat (images, code, etc.)
CREATE TABLE IF NOT EXISTS file_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER,
    file_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Model files for downloads
CREATE TABLE IF NOT EXISTS model_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creation_id UUID REFERENCES creations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    file_format TEXT NOT NULL CHECK (file_format IN ('fbx', 'obj', 'gltf', 'glb')),
    file_url TEXT,
    file_size INTEGER,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Roblox uploaded assets tracking
CREATE TABLE IF NOT EXISTS roblox_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creation_id UUID REFERENCES creations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    roblox_asset_id TEXT NOT NULL,
    asset_name TEXT NOT NULL,
    asset_type TEXT DEFAULT 'Model',
    upload_status TEXT DEFAULT 'pending' CHECK (upload_status IN ('pending', 'processing', 'completed', 'failed')),
    asset_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure projects table has enhanced fields
ALTER TABLE projects ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS last_opened_at TIMESTAMP WITH TIME ZONE;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_file_attachments_conversation ON file_attachments(conversation_id);
CREATE INDEX IF NOT EXISTS idx_file_attachments_message ON file_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_model_files_creation ON model_files(creation_id);
CREATE INDEX IF NOT EXISTS idx_model_files_user ON model_files(user_id);
CREATE INDEX IF NOT EXISTS idx_roblox_assets_creation ON roblox_assets(creation_id);
CREATE INDEX IF NOT EXISTS idx_roblox_assets_user ON roblox_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_roblox_assets_status ON roblox_assets(upload_status);

-- Comments
COMMENT ON TABLE file_attachments IS 'Files attached to AI chat messages for analysis';
COMMENT ON TABLE model_files IS 'Downloaded 3D model files in various formats';
COMMENT ON TABLE roblox_assets IS 'Assets uploaded to Roblox via Open Cloud API';
