-- FIX COMMAND_QUEUE TABLE
-- Run this in Supabase SQL Editor to fix the missing 'data' column

-- Step 1: Drop the existing table if it exists (this will clear any data)
DROP TABLE IF EXISTS public.command_queue CASCADE;

-- Step 2: Create the table with all required columns
CREATE TABLE public.command_queue (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id text NOT NULL,
    type text NOT NULL,
    data jsonb,
    code text,
    status text DEFAULT 'pending',
    created_at timestamptz DEFAULT now(),
    completed_at timestamptz
);

-- Step 3: Create indexes for performance
CREATE INDEX idx_command_queue_user_status ON public.command_queue(user_id, status);
CREATE INDEX idx_command_queue_created ON public.command_queue(created_at);

-- Step 4: Enable Row Level Security
ALTER TABLE public.command_queue ENABLE ROW LEVEL SECURITY;

-- Step 5: Create policy allowing all operations (service role handles auth)
DROP POLICY IF EXISTS "Allow all command queue" ON public.command_queue;
CREATE POLICY "Allow all command queue" ON public.command_queue 
    FOR ALL USING (true) WITH CHECK (true);

-- Step 6: Grant permissions
GRANT ALL ON public.command_queue TO service_role;
GRANT ALL ON public.command_queue TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.command_queue TO anon;

-- Step 7: Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- Verify the table structure
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'command_queue' ORDER BY ordinal_position;
