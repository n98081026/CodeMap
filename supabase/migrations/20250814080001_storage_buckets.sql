-- Create storage buckets for file uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('project_archives', 'project_archives', false, 52428800, ARRAY['application/zip', 'application/x-zip-compressed', 'application/octet-stream'])
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for project_archives bucket
CREATE POLICY "Users can upload their own project files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'project_archives' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view their own project files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'project_archives' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their own project files" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'project_archives' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own project files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'project_archives' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Teachers can view project files from their students
CREATE POLICY "Teachers can view project files from their students" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'project_archives' 
        AND EXISTS (
            SELECT 1 FROM project_submissions ps
            JOIN classrooms c ON ps.classroom_id = c.id
            WHERE c.teacher_id = auth.uid()
            AND ps.file_storage_path = storage.objects.name
        )
    );

-- Admins can view all project files
CREATE POLICY "Admins can view all project files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'project_archives' 
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
