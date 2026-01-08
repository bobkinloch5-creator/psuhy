-- Create storage bucket for generated 3D models
-- Run this in Supabase SQL Editor

-- Create bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-models', 'generated-models', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow authenticated users to upload files
CREATE POLICY "Users can upload models"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'generated-models' AND auth.uid()::text = (storage.foldername(name))[2]);

-- Allow anyone to read models (public access)
CREATE POLICY "Public can view models"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'generated-models');

-- Allow users to delete their own models
CREATE POLICY "Users can delete own models"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'generated-models' AND auth.uid()::text = (storage.foldername(name))[2]);
