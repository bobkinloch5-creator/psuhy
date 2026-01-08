-- Create toolbox_cache table for caching Roblox catalog models
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

-- Create index for faster searches
CREATE INDEX IF NOT EXISTS idx_toolbox_cache_name ON toolbox_cache USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_toolbox_cache_tags ON toolbox_cache USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_toolbox_cache_favorites ON toolbox_cache(favorite_count DESC);

-- Enable RLS
ALTER TABLE toolbox_cache ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read toolbox_cache" ON toolbox_cache FOR SELECT USING (true);

-- Allow authenticated users to insert/update
CREATE POLICY "Allow insert toolbox_cache" ON toolbox_cache FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update toolbox_cache" ON toolbox_cache FOR UPDATE USING (true);
