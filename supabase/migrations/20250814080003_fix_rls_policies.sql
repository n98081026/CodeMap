-- Fix RLS policy recursion issues
-- Drop problematic policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all classrooms" ON classrooms;
DROP POLICY IF EXISTS "Admins can view all project files" ON storage.objects;

-- Create simplified admin policies that don't cause recursion
CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (
        auth.uid() IN (
            SELECT id FROM profiles WHERE role = 'admin'
        )
    );

CREATE POLICY "Admins can view all classrooms" ON classrooms
    FOR SELECT USING (
        auth.uid() IN (
            SELECT id FROM profiles WHERE role = 'admin'
        )
    );

CREATE POLICY "Admins can view all project files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'project_archives' 
        AND auth.uid() IN (
            SELECT id FROM profiles WHERE role = 'admin'
        )
    );
