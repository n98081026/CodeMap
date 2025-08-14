-- Temporarily disable RLS on profiles table to allow testing
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Also disable RLS on system_settings for testing
ALTER TABLE system_settings DISABLE ROW LEVEL SECURITY;
