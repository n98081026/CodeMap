-- Create user role enum
CREATE TYPE user_role_enum AS ENUM ('student', 'teacher', 'admin');

-- Create project submission status enum
CREATE TYPE project_submission_status_enum AS ENUM ('pending', 'queued', 'processing', 'completed', 'failed');

-- Create profiles table
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role user_role_enum NOT NULL DEFAULT 'student',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create classrooms table
CREATE TABLE classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    invite_code TEXT UNIQUE NOT NULL,
    subject TEXT,
    difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    enable_student_ai_analysis BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create classroom_students junction table
CREATE TABLE classroom_students (
    classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (classroom_id, student_id)
);

-- Create concept_maps table
CREATE TABLE concept_maps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    map_data JSONB NOT NULL,
    is_public BOOLEAN DEFAULT false,
    shared_with_classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create project_submissions table
CREATE TABLE project_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL,
    original_file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_storage_path TEXT,
    submission_timestamp TIMESTAMPTZ DEFAULT NOW(),
    analysis_status project_submission_status_enum DEFAULT 'pending',
    analysis_error TEXT,
    generated_concept_map_id UUID REFERENCES concept_maps(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create system_settings table
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001',
    enable_ai_project_analysis BOOLEAN DEFAULT true,
    default_concept_map_visibility TEXT DEFAULT 'private',
    max_project_file_size_mb INTEGER DEFAULT 10,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default system settings
INSERT INTO system_settings (id, enable_ai_project_analysis, default_concept_map_visibility, max_project_file_size_mb)
VALUES ('00000000-0000-0000-0000-000000000001', true, 'private', 10)
ON CONFLICT (id) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_classrooms_teacher_id ON classrooms(teacher_id);
CREATE INDEX idx_classrooms_invite_code ON classrooms(invite_code);
CREATE INDEX idx_classroom_students_classroom_id ON classroom_students(classroom_id);
CREATE INDEX idx_classroom_students_student_id ON classroom_students(student_id);
CREATE INDEX idx_concept_maps_owner_id ON concept_maps(owner_id);
CREATE INDEX idx_concept_maps_shared_with_classroom_id ON concept_maps(shared_with_classroom_id);
CREATE INDEX idx_project_submissions_student_id ON project_submissions(student_id);
CREATE INDEX idx_project_submissions_classroom_id ON project_submissions(classroom_id);
CREATE INDEX idx_project_submissions_analysis_status ON project_submissions(analysis_status);

-- Create RLS (Row Level Security) policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Classrooms policies
CREATE POLICY "Teachers can view their own classrooms" ON classrooms
    FOR SELECT USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can insert their own classrooms" ON classrooms
    FOR INSERT WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers can update their own classrooms" ON classrooms
    FOR UPDATE USING (teacher_id = auth.uid());

CREATE POLICY "Students can view classrooms they're enrolled in" ON classrooms
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM classroom_students 
            WHERE classroom_id = id AND student_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all classrooms" ON classrooms
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Classroom students policies
CREATE POLICY "Students can view their classroom enrollments" ON classroom_students
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Teachers can view students in their classrooms" ON classroom_students
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM classrooms 
            WHERE id = classroom_id AND teacher_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can manage students in their classrooms" ON classroom_students
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM classrooms 
            WHERE id = classroom_id AND teacher_id = auth.uid()
        )
    );

-- Concept maps policies
CREATE POLICY "Users can view their own concept maps" ON concept_maps
    FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can insert their own concept maps" ON concept_maps
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own concept maps" ON concept_maps
    FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can view public concept maps" ON concept_maps
    FOR SELECT USING (is_public = true);

CREATE POLICY "Students can view concept maps shared with their classrooms" ON concept_maps
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM classroom_students 
            WHERE classroom_id = shared_with_classroom_id AND student_id = auth.uid()
        )
    );

-- Project submissions policies
CREATE POLICY "Students can view their own submissions" ON project_submissions
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Students can insert their own submissions" ON project_submissions
    FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Teachers can view submissions in their classrooms" ON project_submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM classrooms 
            WHERE id = classroom_id AND teacher_id = auth.uid()
        )
    );

-- System settings policies (admin only)
CREATE POLICY "Admins can manage system settings" ON system_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create function to handle user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, name, email, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
        NEW.email,
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role_enum, 'student')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classrooms_updated_at
    BEFORE UPDATE ON classrooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_concept_maps_updated_at
    BEFORE UPDATE ON concept_maps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_submissions_updated_at
    BEFORE UPDATE ON project_submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
