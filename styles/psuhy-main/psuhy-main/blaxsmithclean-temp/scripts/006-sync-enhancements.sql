-- Enhanced creations table with full sync support
-- This augments 001-create-tables.sql with additional sync fields

-- Add sync and metadata fields to creations table
ALTER TABLE creations ADD COLUMN IF NOT EXISTS synced_to_studio BOOLEAN DEFAULT false;
ALTER TABLE creations ADD COLUMN IF NOT EXISTS studio_session_id UUID REFERENCES studio_sessions(id);
ALTER TABLE creations ADD COLUMN IF NOT EXISTS roblox_instance_path TEXT;
ALTER TABLE creations ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE creations ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE creations ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Create index for quick sync queries
CREATE INDEX IF NOT EXISTS idx_creations_synced ON creations(synced_to_studio);
CREATE INDEX IF NOT EXISTS idx_creations_session ON creations(studio_session_id);
CREATE INDEX IF NOT EXISTS idx_creations_updated ON creations(updated_at DESC);

-- Create view for recent creations with user info
CREATE OR REPLACE VIEW recent_creations AS
SELECT 
  c.id,
  c.type,
  c.name,
  c.description,
  c.preview_url,
  c.thumbnail_url,
  c.status,
  c.synced_to_studio,
  c.created_at,
  u.username,
  u.discord_id,
  u.avatar
FROM creations c
JOIN users u ON c.user_id = u.id
ORDER BY c.created_at DESC;

-- Function to mark creation as synced
CREATE OR REPLACE FUNCTION mark_creation_synced(creation_id UUID, instance_path TEXT)
RETURNS void AS $$
BEGIN
  UPDATE creations
  SET 
    synced_to_studio = true,
    roblox_instance_path = instance_path,
    updated_at = NOW()
  WHERE id = creation_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's unsync'd creations
CREATE OR REPLACE FUNCTION get_unsynced_creations(user_discord_id TEXT)
RETURNS TABLE (
  id UUID,
  type TEXT,
  name TEXT,
  asset_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.type, c.name, c.asset_data, c.created_at
  FROM creations c
  JOIN users u ON c.user_id = u.id
  WHERE u.discord_id = user_discord_id
    AND c.synced_to_studio = false
    AND c.status = 'ready'
  ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON COLUMN creations.synced_to_studio IS 'Whether this creation has been synced to Roblox Studio';
COMMENT ON COLUMN creations.roblox_instance_path IS 'Full instance path in Roblox Studio (e.g., workspace.Models.Castle)';
COMMENT ON COLUMN creations.metadata IS 'Additional metadata like complexity, performance metrics, etc.';
COMMENT ON COLUMN creations.tags IS 'User-defined tags for organization';
