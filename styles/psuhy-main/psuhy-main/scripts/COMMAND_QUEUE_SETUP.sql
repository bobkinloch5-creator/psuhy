-- Create command_queue table for plugin command delivery
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.command_queue (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id text NOT NULL,
    type text NOT NULL,
    data jsonb,
    code text,
    status text DEFAULT 'pending',
    created_at timestamptz DEFAULT now(),
    completed_at timestamptz
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_command_queue_user_status ON public.command_queue(user_id, status);
CREATE INDEX IF NOT EXISTS idx_command_queue_created ON public.command_queue(created_at);

-- Enable RLS
ALTER TABLE public.command_queue ENABLE ROW LEVEL SECURITY;

-- Allow all operations (service role will use this)
DROP POLICY IF EXISTS "Allow all command queue" ON public.command_queue;
CREATE POLICY "Allow all command queue" ON public.command_queue FOR ALL USING (true) WITH CHECK (true);

-- Grant access
GRANT ALL ON public.command_queue TO service_role;
GRANT ALL ON public.command_queue TO authenticated;
GRANT SELECT, INSERT ON public.command_queue TO anon;
