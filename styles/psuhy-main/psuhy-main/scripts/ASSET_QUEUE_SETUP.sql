-- BlaxSmith Complete Database Setup for Asset Insertion
-- Run this in Supabase SQL Editor

-- 1. Asset Queue Table (Website -> Plugin queue)
CREATE TABLE IF NOT EXISTS public.asset_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    asset_id TEXT NOT NULL,
    asset_type TEXT DEFAULT 'Model',
    asset_name TEXT,
    metadata JSONB,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_asset_queue_user_status ON public.asset_queue(user_id, status);

ALTER TABLE public.asset_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all asset queue" ON public.asset_queue;
CREATE POLICY "Allow all asset queue" ON public.asset_queue FOR ALL USING (true) WITH CHECK (true);

-- 2. Command Queue Table (AI commands -> Plugin)
CREATE TABLE IF NOT EXISTS public.command_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    data JSONB,
    code TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_command_queue_user_status ON public.command_queue(user_id, status);

ALTER TABLE public.command_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all command queue" ON public.command_queue;
CREATE POLICY "Allow all command queue" ON public.command_queue FOR ALL USING (true) WITH CHECK (true);

-- 3. Plugin Heartbeats Table
CREATE TABLE IF NOT EXISTS public.plugin_heartbeats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_heartbeats_user ON public.plugin_heartbeats(user_id);

ALTER TABLE public.plugin_heartbeats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all heartbeats" ON public.plugin_heartbeats;
CREATE POLICY "Allow all heartbeats" ON public.plugin_heartbeats FOR ALL USING (true) WITH CHECK (true);

-- 4. Plugin Connections Table (for tracking)
CREATE TABLE IF NOT EXISTS public.plugin_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    studio_name TEXT,
    last_poll TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.plugin_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all connections" ON public.plugin_connections;
CREATE POLICY "Allow all connections" ON public.plugin_connections FOR ALL USING (true) WITH CHECK (true);

SELECT 'All tables created successfully!' as status;
