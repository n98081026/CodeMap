-- Ensure storage bucket is properly created
-- Drop and recreate the bucket to ensure it exists
DELETE FROM storage.buckets WHERE id = 'project_archives';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('project_archives', 'project_archives', false, 52428800, ARRAY['application/zip', 'application/x-zip-compressed', 'application/octet-stream']);

-- Ensure storage policies exist
DROP POLICY IF EXISTS "Users can upload their own project files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own project files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own project files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own project files" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can view project files from their students" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all project files" ON storage.objects;

-- Create simple storage policies for now
CREATE POLICY "Allow authenticated users to manage project files" ON storage.objects
    FOR ALL USING (
        bucket_id = 'project_archives' 
        AND auth.uid() IS NOT NULL
    );
