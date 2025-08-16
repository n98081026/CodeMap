// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createClassroom,
  getClassroomById,
  addStudentToClassroom,
} from '../classroomService';
import { supabase } from '@/lib/supabaseClient';
import * as userService from '@/services/users/userService';
import { UserRole } from '@/types';

// Mock the entire supabaseClient module
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
  },
}));

// Mock the userService module
vi.mock('@/services/users/userService');

// A helper to construct the fluent API mock
const mockSupabase = () => {
  const mock: any = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
  };
  return {
    ...mock,
    // Add specific terminators here
    single: vi.fn(),
  };
};

const mockedSupabase = supabase as unknown as ReturnType<typeof mockSupabase>;

describe('Classroom Service (Unit Tests)', () => {
  const mockTeacher = {
    id: 'teacher-123',
    name: 'Dr. Professor',
    email: 'prof@school.edu',
    role: UserRole.TEACHER,
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('createClassroom', () => {
    it('should create and return a classroom successfully', async () => {
      // Arrange
      const newClassroomData = {
        name: 'Intro to Programming',
        description: 'A beginner course.',
        teacher_id: mockTeacher.id,
      };
      const dbResponse = {
        id: 'class-456',
        created_at: new Date().toISOString(),
        ...newClassroomData,
        invite_code: 'ABCDE1',
        subject: null,
        difficulty: null,
        enable_student_ai_analysis: true,
      };

      vi.mocked(userService.getUserById).mockResolvedValue(mockTeacher);

      const chainedMock = {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: dbResponse, error: null }),
      };
      vi.mocked(mockedSupabase.from).mockReturnValue({
        ...mockedSupabase,
        insert: vi.fn().mockReturnValue(chainedMock),
      });


      // Act
      const classroom = await createClassroom(
        newClassroomData.name,
        newClassroomData.description,
        newClassroomData.teacher_id
      );

      // Assert
      expect(userService.getUserById).toHaveBeenCalledWith(mockTeacher.id);
      expect(mockedSupabase.from).toHaveBeenCalledWith('classrooms');
      expect(mockedSupabase.from('classrooms').insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: newClassroomData.name,
          description: newClassroomData.description,
          teacher_id: newClassroomData.teacher_id,
        })
      );
      expect(chainedMock.select).toHaveBeenCalled();
      expect(chainedMock.single).toHaveBeenCalled();

      expect(classroom).toBeDefined();
      expect(classroom.id).toBe(dbResponse.id);
      expect(classroom.name).toBe(newClassroomData.name);
      expect(classroom.teacherName).toBe(mockTeacher.name);
    });

    it('should throw an error if the user is not a teacher or admin', async () => {
      // Arrange
      const mockStudent = {
        id: 'student-789',
        name: 'Stu Dent',
        email: 'stu@school.edu',
        role: UserRole.STUDENT,
      };
      vi.mocked(userService.getUserById).mockResolvedValue(mockStudent);

      // Act & Assert
      await expect(
        createClassroom('Hacking 101', 'For l33t h4x0rs', mockStudent.id)
      ).rejects.toThrow(
        'Invalid teacher ID or user is not authorized to create classrooms.'
      );
      expect(userService.getUserById).toHaveBeenCalledWith(mockStudent.id);
      expect(mockedSupabase.from).not.toHaveBeenCalled();
    });

    it('should throw an error if Supabase fails to insert', async () => {
      // Arrange
      const dbError = { message: 'Insert failed', code: '500' };
      vi.mocked(userService.getUserById).mockResolvedValue(mockTeacher);

      const chainedMock = {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: dbError }),
      };
      vi.mocked(mockedSupabase.from).mockReturnValue({
        ...mockedSupabase,
        insert: vi.fn().mockReturnValue(chainedMock),
      });

      // Act & Assert
      await expect(
        createClassroom('Failing Course', undefined, mockTeacher.id)
      ).rejects.toThrow(`Failed to create classroom: ${dbError.message}`);
    });
  });

  describe('getClassroomById', () => {
    it('should return a classroom with student details when found', async () => {
      // Arrange
      const classroomId = 'class-123';
      const dbClassroom = {
        id: classroomId,
        name: 'Advanced Physics',
        teacher_id: mockTeacher.id,
        invite_code: 'PHY456',
      };
      const dbStudents = [{ student_id: 'student-1' }, { student_id: 'student-2' }];
      const dbStudentProfiles = [
        { id: 'student-1', name: 'Sheldon', email: 'shel@cal.tech', role: 'student'},
        { id: 'student-2', name: 'Leonard', email: 'leo@cal.tech', role: 'student'},
      ];

      // Mock for getClassroomById call
      const classroomChain = {
        ...mockSupabase(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { ...dbClassroom, teacher: { name: mockTeacher.name } }, error: null }),
      };

      // Mock for populateStudentDetailsForClassroom calls
      const studentsChain = {
        ...mockSupabase(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: dbStudents, error: null }),
      };
      const profilesChain = {
        ...mockSupabase(),
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: dbStudentProfiles, error: null }),
      };

      vi.mocked(mockedSupabase.from)
        .mockImplementation((tableName: string) => {
            if (tableName === 'classrooms') return classroomChain;
            if (tableName === 'classroom_students') return studentsChain;
            if (tableName === 'profiles') return profilesChain;
            return mockSupabase();
        });

      // Act
      const classroom = await getClassroomById(classroomId);

      // Assert
      expect(mockedSupabase.from).toHaveBeenCalledWith('classrooms');
      expect(classroomChain.eq).toHaveBeenCalledWith('id', classroomId);

      // check that student details were populated
      expect(mockedSupabase.from).toHaveBeenCalledWith('classroom_students');
      expect(studentsChain.eq).toHaveBeenCalledWith('classroom_id', classroomId);
      expect(mockedSupabase.from).toHaveBeenCalledWith('profiles');
      expect(profilesChain.in).toHaveBeenCalledWith('id', ['student-1', 'student-2']);

      expect(classroom).not.toBeNull();
      expect(classroom?.id).toBe(classroomId);
      expect(classroom?.name).toBe('Advanced Physics');
      expect(classroom?.teacherName).toBe(mockTeacher.name);
      expect(classroom?.students).toHaveLength(2);
      expect(classroom?.students[0].name).toBe('Sheldon');
    });

    it('should return null if classroom is not found', async () => {
      // Arrange
       const classroomChain = {
        ...mockSupabase(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }), // Not found error
      };
      vi.mocked(mockedSupabase.from).mockReturnValue(classroomChain);

      // Act
      const classroom = await getClassroomById('non-existent-id');

      // Assert
      expect(classroom).toBeNull();
    });
  });

  describe('addStudentToClassroom', () => {
    const classroomId = 'class-123';
    const mockStudent = { id: 'student-789', name: 'New Student', email: 'new@school.edu', role: UserRole.STUDENT };
    const dbClassroom = { id: classroomId, name: 'Test Class', teacher_id: mockTeacher.id, teacher: { name: mockTeacher.name }};

    const setupMocks = (studentExists: boolean, userIsValid: boolean = true) => {
        vi.mocked(userService.getUserById).mockResolvedValue(userIsValid ? mockStudent : null);

        const classroomFrom = {
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: dbClassroom, error: null }),
        };

        const profilesFrom = {
             select: vi.fn().mockReturnThis(),
             in: vi.fn().mockResolvedValue({ data: [], error: null }),
        };

        const classroomStudentsFrom = {
            insert: vi.fn().mockResolvedValue({ error: null }),
            select: vi.fn((selectArg: string) => {
                // Distinguish calls based on what is being selected
                if (selectArg === 'student_id') { // This is from populateStudentDetailsForClassroom
                    return {
                        eq: vi.fn().mockResolvedValue({ data: [], error: null })
                    };
                }
                if (selectArg === '*') { // This is from the check existing entry call
                    return {
                        eq: vi.fn().mockReturnThis(),
                        maybeSingle: vi.fn().mockResolvedValue({ data: studentExists ? { id: 1 } : null, error: null })
                    };
                }
                return {
                    eq: vi.fn().mockReturnThis(),
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
                }
            })
        };

        vi.mocked(mockedSupabase.from).mockImplementation((tableName: string) => {
            switch (tableName) {
                case 'classrooms': return { ...mockSupabase(), ...classroomFrom };
                case 'profiles': return { ...mockSupabase(), ...profilesFrom };
                case 'classroom_students': return { ...mockSupabase(), ...classroomStudentsFrom };
                default: return mockSupabase();
            }
        });
        return { classroomStudentsFrom };
    };

    it('should add a student to a classroom successfully', async () => {
        // Arrange
        const { classroomStudentsFrom } = setupMocks(false);

        // Act
        const classroom = await addStudentToClassroom(classroomId, mockStudent.id);

        // Assert
        expect(userService.getUserById).toHaveBeenCalledWith(mockStudent.id);
        expect(classroomStudentsFrom.insert).toHaveBeenCalledWith({ classroom_id: classroomId, student_id: mockStudent.id });
        expect(classroom).not.toBeNull();
        expect(classroom?.id).toBe(classroomId);
    });

     it('should throw an error if student is not a valid student', async () => {
        // Arrange
        setupMocks(false, false);

        // Act & Assert
        await expect(addStudentToClassroom(classroomId, 'invalid-student')).rejects.toThrow('Invalid student ID or user is not a student.');
    });

    it('should not re-add a student if they are already in the classroom', async () => {
        // Arrange
        const { classroomStudentsFrom } = setupMocks(true);

        // Act
        await addStudentToClassroom(classroomId, mockStudent.id);

        // Assert
        expect(classroomStudentsFrom.insert).not.toHaveBeenCalled();
    });
  });
});
