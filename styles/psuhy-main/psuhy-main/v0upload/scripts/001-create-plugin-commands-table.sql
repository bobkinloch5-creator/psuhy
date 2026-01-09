-- Create plugin_commands table for storing commands to send to the Roblox Studio plugin
CREATE TABLE IF NOT EXISTS plugin_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  command_type TEXT NOT NULL,
  command_data JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  executed_at TIMESTAMP WITH TIME ZONE
);

-- Create index for faster polling
CREATE INDEX IF NOT EXISTS idx_plugin_commands_user_status 
ON plugin_commands(user_id, status);

-- Create index for cleanup of old commands
CREATE INDEX IF NOT EXISTS idx_plugin_commands_created_at 
ON plugin_commands(created_at);

-- Enable RLS
ALTER TABLE plugin_commands ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own commands
CREATE POLICY "Users can view own commands" ON plugin_commands
  FOR SELECT USING (true);

-- Policy: Service role can insert commands
CREATE POLICY "Service can insert commands" ON plugin_commands
  FOR INSERT WITH CHECK (true);

-- Policy: Service can update commands
CREATE POLICY "Service can update commands" ON plugin_commands
  FOR UPDATE USING (true);
