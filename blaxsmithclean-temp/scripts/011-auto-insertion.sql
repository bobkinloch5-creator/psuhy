-- Auto-insertion enhancement for asset_queue
-- Adds metadata support for generated models

-- Add metadata column to asset_queue
ALTER TABLE asset_queue 
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_asset_queue_type ON asset_queue(asset_type);
CREATE INDEX IF NOT EXISTS idx_asset_queue_created ON asset_queue(created_at);

-- Update command_queue to support more data
ALTER TABLE command_queue
ALTER COLUMN data TYPE JSONB USING data::JSONB;

-- Add comment for documentation
COMMENT ON COLUMN asset_queue.metadata IS 'Stores additional data for generated models (URLs, formats, etc.)';
COMMENT ON TABLE asset_queue IS 'Queue for assets waiting to be inserted into Roblox Studio';
COMMENT ON TABLE command_queue IS 'Queue for Lua scripts and commands to execute in Studio';
