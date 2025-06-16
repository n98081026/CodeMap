// src/services/classrooms/classroomService.test.ts
import { createClassroom, getClassroomById } from './classroomService'; // Added getClassroomById
import { supabase } from '@/lib/supabaseClient';
import { getUserById } from '@/services/users/userService';
import { UserRole, type User, type Classroom } from '@/types';

// Mock the modules
jest.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(), // Added mock for .eq()
    single: jest.fn(),
  },
}));

jest.mock('@/services/users/userService', () => ({
  getUserById: jest.fn(),
}));

describe('classroomService', () => {
  // Mocks for createClassroom
  const mockCreateSupabaseFrom = supabase.from as jest.Mock;
  let mockCreateSupabaseInsert: jest.Mock;
  let mockCreateSupabaseSelect: jest.Mock;
  let mockCreateSupabaseSingle: jest.Mock;

  // Mocks for getClassroomById (can reuse some, but select and single might differ if chained differently)
  // Note: supabase.from is already mocked. We re-assign it here for clarity within scope if needed,
  // but it's the same mock object.
  const mockGetByIdSupabaseFrom = supabase.from as jest.Mock;
  let mockGetByIdSupabaseSelect: jest.Mock;
  let mockGetByIdSupabaseEq: jest.Mock;
  let mockGetByIdSupabaseSingle: jest.Mock;


  const mockGetUserById = getUserById as jest.Mock;

  beforeEach(() => {
    // Reset mocks before each test

    // Setup for createClassroom
    // This re-initialization ensures that the mocks are fresh for each test,
    // especially for chained calls.
    mockCreateSupabaseInsert = jest.fn().mockReturnThis();
    mockCreateSupabaseSelect = jest.fn().mockReturnThis();
    mockCreateSupabaseSingle = jest.fn();
    mockCreateSupabaseFrom.mockClear().mockReturnValue({
      insert: mockCreateSupabaseInsert,
    });
    mockCreateSupabaseInsert.mockReturnValue({
      select: mockCreateSupabaseSelect,
    });
    mockCreateSupabaseSelect.mockReturnValue({
      single: mockCreateSupabaseSingle,
    });


    // Setup for getClassroomById
    mockGetByIdSupabaseSelect = jest.fn().mockReturnThis();
    mockGetByIdSupabaseEq = jest.fn().mockReturnThis();
    mockGetByIdSupabaseSingle = jest.fn();
    // Assuming mockGetByIdSupabaseFrom is the same as mockCreateSupabaseFrom, or supabase.from directly
    (supabase.from as jest.Mock).mockClear().mockReturnValue({ // Use the global jest.mocked supabase.from
        select: mockGetByIdSupabaseSelect,
    });
     mockGetByIdSupabaseSelect.mockReturnValue({
        eq: mockGetByIdSupabaseEq,
    });
    mockGetByIdSupabaseEq.mockReturnValue({
        single: mockGetByIdSupabaseSingle,
    });

    mockGetUserById.mockReset();
  });

  describe('createClassroom', () => {
    const teacherUser: User = {
      id: 'teacher1',
      email: 'teacher@example.com',
      name: 'Test Teacher',
      role: UserRole.TEACHER,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const classroomInput = {
      name: 'New Classroom',
      description: 'A great classroom for testing',
      teacherId: teacherUser.id,
    };

    const supabaseClassroomRecord = {
      id: 'classroom123',
      name: classroomInput.name,
      description: classroomInput.description,
      teacher_id: classroomInput.teacherId,
      subject: 'General',
      difficulty: 'Beginner',
      enable_student_ai_analysis: false,
      invite_code: 'TESTCD',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    it('should create a classroom successfully', async () => {
      mockGetUserById.mockResolvedValue(teacherUser);
      mockCreateSupabaseSingle.mockResolvedValue({ data: supabaseClassroomRecord, error: null });

      const result = await createClassroom(
        classroomInput.name,
        classroomInput.description,
        classroomInput.teacherId
      );

      expect(mockGetUserById).toHaveBeenCalledWith(classroomInput.teacherId);
      expect(mockCreateSupabaseFrom).toHaveBeenCalledWith('classrooms');
      expect(mockCreateSupabaseInsert).toHaveBeenCalledWith(expect.objectContaining({
        name: classroomInput.name,
        description: classroomInput.description,
        teacher_id: classroomInput.teacherId,
        subject: 'General',
        difficulty: 'Beginner',
        enable_student_ai_analysis: false,
        invite_code: expect.any(String),
      }));
      expect(mockCreateSupabaseSelect).toHaveBeenCalled();
      expect(mockCreateSupabaseSingle).toHaveBeenCalled();

      expect(result).toEqual(expect.objectContaining({
        id: supabaseClassroomRecord.id,
        name: supabaseClassroomRecord.name,
        teacherId: supabaseClassroomRecord.teacher_id,
        description: supabaseClassroomRecord.description,
        subject: supabaseClassroomRecord.subject,
        difficulty: supabaseClassroomRecord.difficulty,
        enableStudentAiAnalysis: supabaseClassroomRecord.enable_student_ai_analysis,
        inviteCode: supabaseClassroomRecord.invite_code,
      }));
      expect(result.inviteCode).toHaveLength(6);
    });

    it('should throw an error if teacherId is invalid or user is not a teacher', async () => {
      mockGetUserById.mockResolvedValue(null);

      await expect(createClassroom(
        classroomInput.name,
        classroomInput.description,
        'invalid-teacher-id'
      )).rejects.toThrow('Invalid teacher ID. User does not exist or is not a teacher.');

      expect(mockCreateSupabaseFrom).not.toHaveBeenCalled();
    });

    it('should throw an error if user is not a teacher', async () => {
      mockGetUserById.mockResolvedValue({ ...teacherUser, role: UserRole.STUDENT });

      await expect(createClassroom(
          classroomInput.name,
          classroomInput.description,
          teacherUser.id
      )).rejects.toThrow('Invalid teacher ID. User does not exist or is not a teacher.');

      expect(mockCreateSupabaseFrom).not.toHaveBeenCalled();
    });

    it('should throw an error if Supabase insert fails', async () => {
      mockGetUserById.mockResolvedValue(teacherUser);
      const supabaseError = { message: 'Supabase insert error', code: '12345', details: '', hint: '' };
      mockCreateSupabaseSingle.mockResolvedValue({ data: null, error: supabaseError });

      await expect(createClassroom(
        classroomInput.name,
        classroomInput.description,
        classroomInput.teacherId
      )).rejects.toThrow(`Failed to create classroom: ${supabaseError.message}`);
    });

    it('should throw an error if Supabase returns no data after insert', async () => {
      mockGetUserById.mockResolvedValue(teacherUser);
      mockCreateSupabaseSingle.mockResolvedValue({ data: null, error: null });

      await expect(createClassroom(
        classroomInput.name,
        classroomInput.description,
        classroomInput.teacherId
      )).rejects.toThrow('Failed to create classroom: No data returned.');
    });

    it('should generate a 6-character invite code', async () => {
      mockGetUserById.mockResolvedValue(teacherUser);
      const generatedInviteCode = 'AB7DE1';
      mockCreateSupabaseSingle.mockResolvedValue({
          data: { ...supabaseClassroomRecord, invite_code: generatedInviteCode },
          error: null
      });

      const result = await createClassroom(
        classroomInput.name,
        classroomInput.description,
        classroomInput.teacherId
      );

      expect(mockCreateSupabaseInsert).toHaveBeenCalledWith(expect.objectContaining({
        invite_code: expect.stringMatching(/^[A-Z0-9]{6}$/),
      }));
      expect(result.inviteCode).toBe(generatedInviteCode);
      expect(result.inviteCode).toHaveLength(6);
    });
  });

  describe('getClassroomById', () => {
    const classroomId = 'classroom123';
    const mockSupabaseResponse = {
      id: classroomId,
      name: 'Test Classroom',
      description: 'A classroom for testing',
      teacher_id: 'teacher1',
      subject: 'Testing',
      difficulty: 'intermediate',
      enable_student_ai_analysis: true,
      invite_code: 'TESTC1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      teacher: { id: 'teacher1', name: 'Prof. Minerva', email: 'minerva@hogwarts.edu', role: UserRole.TEACHER, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, // Added created_at/updated_at for User type
      students: [
        { user_id: 'student1', profiles: { id: 'student1', name: 'Harry Potter', email: 'harry@hogwarts.edu', role: UserRole.STUDENT, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }},
        { user_id: 'student2', profiles: { id: 'student2', name: 'Hermione Granger', email: 'hermione@hogwarts.edu', role: UserRole.STUDENT, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }}
      ]
    };

    it('should retrieve a classroom successfully by ID and map joined data', async () => {
      // Ensure the global supabase.from mock is configured for this specific chain
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: mockGetByIdSupabaseSelect.mockReturnValueOnce({
          eq: mockGetByIdSupabaseEq.mockReturnValueOnce({
            single: mockGetByIdSupabaseSingle.mockResolvedValueOnce({ data: mockSupabaseResponse, error: null }),
          }),
        }),
      });

      const result = await getClassroomById(classroomId);

      expect(supabase.from).toHaveBeenCalledWith('classrooms');
      expect(mockGetByIdSupabaseSelect).toHaveBeenCalledWith('*, students:classroom_students(user_id, profiles:users(id, name, email, role)), teacher:profiles!classrooms_teacher_id_fkey(id, name, email, role)');
      expect(mockGetByIdSupabaseEq).toHaveBeenCalledWith('id', classroomId);
      expect(mockGetByIdSupabaseSingle).toHaveBeenCalled();

      expect(result).not.toBeNull();
      expect(result?.id).toBe(classroomId);
      expect(result?.name).toBe(mockSupabaseResponse.name);
      expect(result?.teacherId).toBe(mockSupabaseResponse.teacher_id);
      expect(result?.teacherName).toBe(mockSupabaseResponse.teacher.name);
      expect(result?.students).toHaveLength(2);
      expect(result?.students).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'student1', name: 'Harry Potter', email: 'harry@hogwarts.edu', role: UserRole.STUDENT }),
          expect.objectContaining({ id: 'student2', name: 'Hermione Granger', email: 'hermione@hogwarts.edu', role: UserRole.STUDENT }),
        ])
      );
    });

    it('should return null if classroom is not found (PGRST116 error)', async () => {
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: mockGetByIdSupabaseSelect.mockReturnValueOnce({
          eq: mockGetByIdSupabaseEq.mockReturnValueOnce({
            single: mockGetByIdSupabaseSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116', message: 'Row not found', details: '', hint: '' } }),
          }),
        }),
      });
      const result = await getClassroomById(classroomId);
      expect(result).toBeNull();
    });

    it('should return null if classroom is not found (no data, no error)', async () => {
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: mockGetByIdSupabaseSelect.mockReturnValueOnce({
          eq: mockGetByIdSupabaseEq.mockReturnValueOnce({
            single: mockGetByIdSupabaseSingle.mockResolvedValueOnce({ data: null, error: null }),
          }),
        }),
      });
      const result = await getClassroomById(classroomId);
      expect(result).toBeNull();
    });

    it('should throw an error if Supabase select fails (non-PGRST116 error)', async () => {
      const supabaseError = { message: 'Supabase select error', code: 'XYZ01', details: '', hint: '' };
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: mockGetByIdSupabaseSelect.mockReturnValueOnce({
          eq: mockGetByIdSupabaseEq.mockReturnValueOnce({
            single: mockGetByIdSupabaseSingle.mockResolvedValueOnce({ data: null, error: supabaseError }),
          }),
        }),
      });
      await expect(getClassroomById(classroomId)).rejects.toThrow(`Failed to fetch classroom details: ${supabaseError.message}`);
    });

    it('should handle classroom with no students correctly', async () => {
        const responseNoStudents = { ...mockSupabaseResponse, students: [] };
        (supabase.from as jest.Mock).mockReturnValueOnce({
            select: mockGetByIdSupabaseSelect.mockReturnValueOnce({
              eq: mockGetByIdSupabaseEq.mockReturnValueOnce({
                single: mockGetByIdSupabaseSingle.mockResolvedValueOnce({ data: responseNoStudents, error: null }),
              }),
            }),
          });
        const result = await getClassroomById(classroomId);
        expect(result?.students).toEqual([]);
    });

    it('should handle classroom with no teacher joined (e.g. foreign key null or teacher profile missing)', async () => {
        // Supabase might return null for the teacher relation if the join finds no matching teacher profile
        const responseNoTeacher = { ...mockSupabaseResponse, teacher: null };
         (supabase.from as jest.Mock).mockReturnValueOnce({
            select: mockGetByIdSupabaseSelect.mockReturnValueOnce({
              eq: mockGetByIdSupabaseEq.mockReturnValueOnce({
                single: mockGetByIdSupabaseSingle.mockResolvedValueOnce({ data: responseNoTeacher, error: null }),
              }),
            }),
          });
        const result = await getClassroomById(classroomId);
        expect(result?.teacherName).toBeNull();
    });
  });
});
