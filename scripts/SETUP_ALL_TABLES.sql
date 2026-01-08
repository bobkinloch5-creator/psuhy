-- ============================================================
-- BLAXSMITH COMPLETE DATABASE SETUP
-- Run this in Supabase SQL Editor to set up all required tables
-- ============================================================

-- 1. ASSET QUEUE: For sending assets from website to Roblox plugin
CREATE TABLE IF NOT EXISTS asset_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    asset_id TEXT NOT NULL,
    asset_type TEXT DEFAULT 'Model',
    asset_name TEXT DEFAULT 'Asset',
    metadata JSONB DEFAULT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_asset_queue_user_status ON asset_queue(user_id, status);
CREATE INDEX IF NOT EXISTS idx_asset_queue_created ON asset_queue(created_at DESC);

-- Enable RLS but allow service role full access
ALTER TABLE asset_queue ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert
CREATE POLICY "Allow insert asset_queue" ON asset_queue FOR INSERT WITH CHECK (true);

-- Allow public read for plugin polling
CREATE POLICY "Allow read asset_queue" ON asset_queue FOR SELECT USING (true);

-- Allow updates for marking as completed
CREATE POLICY "Allow update asset_queue" ON asset_queue FOR UPDATE USING (true);

-- 2. COMMAND QUEUE: For sending commands from website to Roblox plugin
CREATE TABLE IF NOT EXISTS command_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    data JSONB DEFAULT NULL,
    code TEXT DEFAULT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_command_queue_user_status ON command_queue(user_id, status);
CREATE INDEX IF NOT EXISTS idx_command_queue_created ON command_queue(created_at DESC);

-- Enable RLS
ALTER TABLE command_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert command_queue" ON command_queue FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow read command_queue" ON command_queue FOR SELECT USING (true);
CREATE POLICY "Allow update command_queue" ON command_queue FOR UPDATE USING (true);

-- 3. PLUGIN CONNECTIONS: Track active plugin sessions
CREATE TABLE IF NOT EXISTS plugin_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL UNIQUE,
    last_poll TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    plugin_version TEXT DEFAULT '1.0.0',
    studio_info JSONB DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plugin_connections_user ON plugin_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_plugin_connections_last_poll ON plugin_connections(last_poll DESC);

ALTER TABLE plugin_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all plugin_connections" ON plugin_connections FOR ALL USING (true);

-- 4. TOOLBOX CACHE: Cache Roblox catalog search results
CREATE TABLE IF NOT EXISTS toolbox_cache (
    id BIGINT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    creator_name TEXT,
    creator_verified BOOLEAN DEFAULT FALSE,
    favorite_count INTEGER DEFAULT 0,
    price INTEGER DEFAULT 0,
    asset_type TEXT DEFAULT 'Model',
    thumbnail_url TEXT,
    product_url TEXT,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_toolbox_cache_name ON toolbox_cache USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_toolbox_cache_favorites ON toolbox_cache(favorite_count DESC);

ALTER TABLE toolbox_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read toolbox_cache" ON toolbox_cache FOR SELECT USING (true);
CREATE POLICY "Allow insert toolbox_cache" ON toolbox_cache FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update toolbox_cache" ON toolbox_cache FOR UPDATE USING (true);

-- 5. Ensure users table has credit columns
DO $$
BEGIN
    -- Add generation_credits if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'generation_credits') THEN
        ALTER TABLE users ADD COLUMN generation_credits INTEGER DEFAULT 999999999;
    END IF;
    
    -- Add model_credits if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'model_credits') THEN
        ALTER TABLE users ADD COLUMN model_credits INTEGER DEFAULT 999999999;
    END IF;
    
    -- Add world_credits if missing  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'world_credits') THEN
        ALTER TABLE users ADD COLUMN world_credits INTEGER DEFAULT 999999999;
    END IF;
END $$;

-- Print success
SELECT 'All tables created successfully!' AS result;
