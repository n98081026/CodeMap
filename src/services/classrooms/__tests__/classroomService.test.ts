// src/services/classrooms/classroomService.test.ts
import {
  createClassroom,
  getClassroomById,
  getClassroomsByTeacherId,
  getAllClassrooms,
  updateClassroom,
  deleteClassroom,
  addStudentToClassroom,
  removeStudentFromClassroom,
} from '../classroomService';

import * as config from '@/lib/config';
import { supabase } from '@/lib/supabaseClient';
import { getUserById } from '@/services/users/userService';
import { UserRole, type User, type Classroom } from '@/types';

// Mock the entire config module
vi.mock('@/lib/config', async (importOriginal) => {
  const actualConfig = await importOriginal<typeof config>();
  return {
    ...actualConfig,
    BYPASS_AUTH_FOR_TESTING: false, // Force bypass to be off for these tests
  };
});

// Mock the modules
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('@/services/users/userService', () => ({
  getUserById: vi.fn(),
}));

describe('classroomService', () => {
  const mockSupabaseFrom = supabase.from as vi.Mock;
  const mockGetUserById = getUserById as vi.Mock;

  let mockSelect: vi.Mock;
  let mockInsert: vi.Mock;
  let mockUpdate: vi.Mock;
  let mockDelete: vi.Mock;
  let mockEq: vi.Mock;
  let mockIn: vi.Mock;
  let mockSingle: vi.Mock;
  let mockMaybeSingle: vi.Mock;
  let mockOrder: vi.Mock;
  let mockRange: vi.Mock;
  let mockRpc: vi.Mock;
  let mockIlike: vi.Mock;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset individual chained mocks
    mockSelect = vi.fn().mockReturnThis();
    mockInsert = vi.fn().mockReturnThis();
    mockUpdate = vi.fn().mockReturnThis();
    mockDelete = vi.fn().mockReturnThis();
    mockEq = vi.fn().mockReturnThis();
    mockIn = vi.fn().mockReturnThis();
    mockSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    mockOrder = vi.fn().mockReturnThis();
    mockRange = vi
      .fn()
      .mockResolvedValue({ data: [], error: null, count: 0 });
    mockRpc = vi.fn().mockResolvedValue({ data: [], error: null });
    mockIlike = vi.fn().mockReturnThis();

    mockSupabaseFrom.mockImplementation(() => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      eq: mockEq,
      in: mockIn,
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
      order: mockOrder,
      range: mockRange,
      ilike: mockIlike,
    }));

    (supabase as any).rpc = mockRpc;

    mockGetUserById.mockReset();
  });

  describe('createClassroom', () => {
    const teacherUser: User = {
      id: 'teacher1',
      email: 'teacher@example.com',
      name: 'Test Teacher',
      role: UserRole.TEACHER,
    };
    const classroomInput = {
      name: 'New Classroom',
      description: 'A great classroom',
      teacherId: teacherUser.id,
    };
    const supabaseClassroomRecord = {
      id: 'classroom123',
      name: classroomInput.name,
      description: classroomInput.description,
      teacher_id: classroomInput.teacherId,
      subject: 'General',
      difficulty: 'beginner',
      enable_student_ai_analysis: false,
      invite_code: 'TESTCD',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    it('should create a classroom successfully', async () => {
      mockGetUserById.mockResolvedValue(teacherUser);
      mockInsert.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: supabaseClassroomRecord,
            error: null,
          }),
        }),
      });

      const result = await createClassroom(
        classroomInput.name,
        classroomInput.description,
        classroomInput.teacherId
      );

      expect(mockGetUserById).toHaveBeenCalledWith(classroomInput.teacherId);
      expect(mockSupabaseFrom).toHaveBeenCalledWith('classrooms');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: classroomInput.name,
          teacher_id: classroomInput.teacherId,
          invite_code: expect.any(String),
        })
      );
      expect(result.teacherName).toBe(teacherUser.name);
      expect(result.inviteCode).toHaveLength(6);
    });

    it('should throw an error if teacherId is invalid or user is not authorized', async () => {
      mockGetUserById.mockResolvedValue(null);
      await expect(
        createClassroom(
          classroomInput.name,
          classroomInput.description,
          'invalid-teacher-id'
        )
      ).rejects.toThrow(
        'Invalid teacher ID or user is not authorized to create classrooms.'
      );
    });

    it('should throw an error if user is not a teacher', async () => {
      mockGetUserById.mockResolvedValue({
        ...teacherUser,
        role: UserRole.STUDENT,
      });
      await expect(
        createClassroom(
          classroomInput.name,
          classroomInput.description,
          teacherUser.id
        )
      ).rejects.toThrow(
        'Invalid teacher ID or user is not authorized to create classrooms.'
      );
    });

    it('should throw an error if Supabase insert fails', async () => {
      mockGetUserById.mockResolvedValue(teacherUser);
      const supabaseError = {
        message: 'Supabase insert error',
        code: '12345',
        details: '',
        hint: '',
      };
      mockInsert.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: supabaseError }),
        }),
      });

      await expect(
        createClassroom(
          classroomInput.name,
          classroomInput.description,
          classroomInput.teacherId
        )
      ).rejects.toThrow(`Failed to create classroom: ${supabaseError.message}`);
    });

    it('should throw an error if Supabase returns no data after insert', async () => {
      mockGetUserById.mockResolvedValue(teacherUser);
      mockInsert.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      });

      await expect(
        createClassroom(
          classroomInput.name,
          classroomInput.description,
          classroomInput.teacherId
        )
      ).rejects.toThrow('Failed to create classroom: No data returned.');
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
      teacher: {
        id: 'teacher1',
        name: 'Prof. Minerva',
        email: 'minerva@hogwarts.edu',
        role: UserRole.TEACHER,
      },
    };

    it('should retrieve a classroom successfully by ID', async () => {
      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockSupabaseResponse,
            error: null,
          }),
        }),
      });

      // Mock student fetching
      mockSupabaseFrom.mockImplementation((tableName) => {
        if (tableName === 'classrooms') {
          return {
            select: mockSelect,
          };
        }
        if (tableName === 'classroom_students') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        return {};
      });

      const result = await getClassroomById(classroomId);

      expect(mockSupabaseFrom).toHaveBeenCalledWith('classrooms');
      expect(mockSelect).toHaveBeenCalledWith(
        '*, teacher:profiles!teacher_id(name)'
      );
      expect(result?.teacherName).toBe('Prof. Minerva');
      expect(result?.students).toEqual([]);
    });

    it('should return null if classroom is not found (PGRST116 error)', async () => {
      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116', message: 'Row not found' },
          }),
        }),
      });

      const result = await getClassroomById(classroomId);
      expect(result).toBeNull();
    });
  });

  describe('getClassroomsByTeacherId', () => {
    const teacherId = 'teacherWithClasses';
    const mockTeacherProfile = {
      id: teacherId,
      name: 'Prof. Minerva',
      email: 'minerva@hogwarts.edu',
      role: UserRole.TEACHER,
    };
    const dbRecords = [
      {
        id: 'c1',
        teacher_id: teacherId,
        teacher: mockTeacherProfile,
        name: 'Class 1',
        description: '',
        invite_code: 'C1',
        subject: 'Sub',
        difficulty: 'beginner',
        enable_student_ai_analysis: true,
      },
    ];

    it('should retrieve paginated classrooms for a teacher', async () => {
      mockSelect.mockImplementation((select) => {
        if (select.includes('count')) {
          return {
            eq: vi.fn().mockReturnValue({
              ilike: vi.fn().mockResolvedValue({ data: dbRecords, error: null, count: 1 }),
            }),
          };
        }
        return {
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({ data: dbRecords, error: null, count: 1 }),
            }),
          }),
        };
      });

      // Mock student count for each classroom
      mockSupabaseFrom.mockImplementation((tableName) => {
        if (tableName === 'classrooms') {
          return { select: mockSelect };
        }
        if (tableName === 'classroom_students') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
              }),
            }),
          };
        }
        return {};
      });


      const result = await getClassroomsByTeacherId(teacherId, 1, 10);
      expect(result.totalCount).toBe(1);
      expect(result.classrooms[0].teacherName).toBe(mockTeacherProfile.name);
    });
  });

  describe('getAllClassrooms', () => {
    const mockTeacher1 = {
      id: 't1',
      name: 'Teacher One',
      role: UserRole.TEACHER,
      email: '',
    };
    const dbRecords = [
      {
        id: 'c1',
        name: 'Class A',
        teacher_id: 't1',
        teacher: mockTeacher1,
        description: '',
        invite_code: 'CA',
        subject: null,
        difficulty: null,
        enable_student_ai_analysis: true,
      },
    ];

    it('should retrieve a list of all classrooms', async () => {
      mockSelect.mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: dbRecords, error: null }),
      });

      // Mock student count
      mockSupabaseFrom.mockImplementation((tableName) => {
        if (tableName === 'classrooms') {
          return { select: mockSelect };
        }
        if (tableName === 'classroom_students') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockResolvedValue({ data: [], error: null, count: 5 }),
              }),
            }),
          };
        }
        return {};
      });

      const result = await getAllClassrooms();
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Class A');
    });
  });

  describe('updateClassroom', () => {
    const classroomId = 'cUpdate1';
    const teacherId = 'tUpdate1';
    const existingRecord = {
      id: classroomId,
      teacher_id: teacherId,
      name: 'Old Name',
      teacher: { id: teacherId, name: 'T. Update' },
    };
    const updates = { name: 'New Name' };

    it('should update a classroom successfully', async () => {
      // Mock getClassroomById to return a valid classroom
      mockSupabaseFrom.mockImplementation((tableName) => {
        if (tableName === 'classrooms') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: existingRecord, error: null }),
              }),
            }),
            update: mockUpdate,
          };
        }
        if (tableName === 'classroom_students') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        return {};
      });

       // Mock the update call
      mockUpdate.mockReturnValueOnce({
        eq: vi.fn().mockReturnValueOnce({
         select: vi.fn().mockReturnValueOnce({
          single: vi.fn().mockResolvedValueOnce({ data: {...existingRecord, ...updates}, error: null }),
         })
        }),
      });


      const result = await updateClassroom(classroomId, updates);
      expect(result?.name).toBe('New Name');
      expect(mockSupabaseFrom).toHaveBeenCalledWith('classrooms');
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining(updates));
    });
  });

  describe('deleteClassroom', () => {
    const classroomId = 'cDelete1';

    it('should delete a classroom successfully', async () => {
      // Mock student enrollments deletion
      mockDelete.mockReturnValueOnce({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      // Mock classroom deletion
      mockDelete.mockReturnValueOnce({
        eq: vi.fn().mockResolvedValue({ error: null, count: 1 }),
      });

      const result = await deleteClassroom(classroomId);

      expect(result).toBe(true);
      expect(mockSupabaseFrom).toHaveBeenCalledWith('classroom_students');
      expect(mockSupabaseFrom).toHaveBeenCalledWith('classrooms');
      expect(mockDelete).toHaveBeenCalledTimes(2);
    });

    it('should return false if classroom not found for deletion', async () => {
      mockDelete.mockReturnValueOnce({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }); // students
      mockDelete.mockReturnValueOnce({
        eq: vi.fn().mockResolvedValue({ error: null, count: 0 }),
      }); // classroom

      const result = await deleteClassroom(classroomId);
      expect(result).toBe(false);
    });

    it('should throw error if Supabase fails to delete students', async () => {
      const studentDeleteError = { message: 'Failed to delete students' };
      mockDelete.mockReturnValueOnce({
        eq: vi.fn().mockResolvedValue({ error: studentDeleteError }),
      });

      await expect(deleteClassroom(classroomId)).rejects.toThrow(
        `Failed to delete student enrollments for classroom: ${studentDeleteError.message}`
      );
    });
  });
});
