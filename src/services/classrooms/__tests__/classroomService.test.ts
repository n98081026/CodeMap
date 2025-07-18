// src/services/classrooms/classroomService.test.ts
import {
  createClassroom,
  getClassroomById,
  getClassroomsByTeacherId,
  getAllClassrooms,
  updateClassroom,
  deleteClassroom,
} from '../classroomService'; // Added deleteClassroom

import { supabase } from '@/lib/supabaseClient';
import { getUserById } from '@/services/users/userService';
import { UserRole, type User, type Classroom } from '@/types';

// Mock the modules
jest.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: jest.fn(), // Will be implemented in beforeEach or tests
    // Individual chained methods will be mocks on the object returned by from()
  },
}));

jest.mock('@/services/users/userService', () => ({
  getUserById: jest.fn(),
}));

describe('classroomService', () => {
  const mockSupabaseFrom = supabase.from as jest.Mock;
  const mockGetUserById = getUserById as jest.Mock;

  // Common mocks for chained calls, can be specialized in tests
  let mockSelect = jest.fn();
  let mockInsert = jest.fn();
  let mockUpdate = jest.fn();
  let mockDelete = jest.fn();
  let mockEq = jest.fn();
  let mockSingle = jest.fn();
  let mockOrder = jest.fn();
  let mockRange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset individual chained mocks
    mockSelect = jest.fn().mockReturnThis();
    mockInsert = jest.fn().mockReturnThis();
    mockUpdate = jest.fn().mockReturnThis();
    mockDelete = jest.fn().mockReturnThis();
    mockEq = jest.fn().mockReturnThis();
    mockSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    mockOrder = jest.fn().mockReturnThis();
    mockRange = jest
      .fn()
      .mockResolvedValue({ data: [], error: null, count: 0 });

    // Default mock for supabase.from()
    // Tests can override this with mockImplementationOnce for specific table interactions
    mockSupabaseFrom.mockImplementation(() => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      eq: mockEq,
      single: mockSingle,
      order: mockOrder,
      range: mockRange,
    }));

    mockGetUserById.mockReset();
  });

  describe('createClassroom', () => {
    const teacherUser: User = {
      id: 'teacher1',
      email: 'teacher@example.com',
      name: 'Test Teacher',
      role: UserRole.TEACHER,
      createdAt: '',
      updatedAt: '',
    };
    const classroomInput = {
      name: 'New Classroom',
      description: 'A great classroom',
      teacherId: teacherUser.id,
    };
    const supabaseClassroomRecord = {
      id: 'classroom123',
      ...classroomInput,
      teacher_id: classroomInput.teacherId,
      subject: 'General',
      difficulty: 'Beginner',
      enable_student_ai_analysis: false,
      invite_code: 'TESTCD',
      created_at: '',
      updated_at: '',
    };

    it('should create a classroom successfully', async () => {
      mockGetUserById.mockResolvedValue(teacherUser);
      // Specific chain for create: from -> insert -> select -> single
      mockSupabaseFrom.mockImplementationOnce(() => ({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(), // This select is part of the insert chain
      }));
      (supabase.from('classrooms').insert({}) as any).select = jest
        .fn()
        .mockReturnThis(); // Mock select on insert
      (supabase.from('classrooms').insert({}).select() as any).single =
        mockSingle; // Mock single on select
      mockSingle.mockResolvedValueOnce({
        data: supabaseClassroomRecord,
        error: null,
      });

      const result = await createClassroom(
        classroomInput.name,
        classroomInput.description,
        classroomInput.teacherId
      );

      expect(mockGetUserById).toHaveBeenCalledWith(classroomInput.teacherId);
      expect(mockSupabaseFrom).toHaveBeenCalledWith('classrooms');
      const insertMock = supabase.from('classrooms').insert as jest.Mock; // Get the mock for insert
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: classroomInput.name,
          teacher_id: classroomInput.teacherId,
          invite_code: expect.any(String),
        })
      );

      expect(result.inviteCode).toHaveLength(6);
    });

    it('should throw an error if teacherId is invalid or user is not a teacher', async () => {
      mockGetUserById.mockResolvedValue(null);
      await expect(
        createClassroom(
          classroomInput.name,
          classroomInput.description,
          'invalid-teacher-id'
        )
      ).rejects.toThrow(
        'Invalid teacher ID. User does not exist or is not a teacher.'
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
        'Invalid teacher ID. User does not exist or is not a teacher.'
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
      mockSupabaseFrom.mockImplementationOnce(() => ({
        insert: jest.fn().mockReturnThis(),
      }));
      (supabase.from('classrooms').insert({}) as any).select = jest
        .fn()
        .mockReturnThis();
      (supabase.from('classrooms').insert({}).select() as any).single =
        mockSingle;
      mockSingle.mockResolvedValueOnce({ data: null, error: supabaseError });

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
      mockSupabaseFrom.mockImplementationOnce(() => ({
        insert: jest.fn().mockReturnThis(),
      }));
      (supabase.from('classrooms').insert({}) as any).select = jest
        .fn()
        .mockReturnThis();
      (supabase.from('classrooms').insert({}).select() as any).single =
        mockSingle;
      mockSingle.mockResolvedValueOnce({ data: null, error: null });

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
      created_at: '',
      updated_at: '',
      teacher: {
        id: 'teacher1',
        name: 'Prof. Minerva',
        email: 'minerva@hogwarts.edu',
        role: UserRole.TEACHER,
        created_at: '',
        updated_at: '',
      },
      students: [
        {
          user_id: 'student1',
          profiles: {
            id: 'student1',
            name: 'Harry Potter',
            email: 'harry@hogwarts.edu',
            role: UserRole.STUDENT,
            created_at: '',
            updated_at: '',
          },
        },
        {
          user_id: 'student2',
          profiles: {
            id: 'student2',
            name: 'Hermione Granger',
            email: 'hermione@hogwarts.edu',
            role: UserRole.STUDENT,
            created_at: '',
            updated_at: '',
          },
        },
      ],
    };

    it('should retrieve a classroom successfully by ID and map joined data', async () => {
      mockSupabaseFrom.mockImplementationOnce(() => ({ select: mockSelect }));
      mockSelect.mockReturnValueOnce({ eq: mockEq });
      mockEq.mockReturnValueOnce({ single: mockSingle });
      mockSingle.mockResolvedValueOnce({
        data: mockSupabaseResponse,
        error: null,
      });

      const result = await getClassroomById(classroomId);

      expect(mockSupabaseFrom).toHaveBeenCalledWith('classrooms');
      expect(mockSelect).toHaveBeenCalledWith(
        '*, students:classroom_students(user_id, profiles:users(id, name, email, role)), teacher:profiles!classrooms_teacher_id_fkey(id, name, email, role)'
      );
      expect(mockEq).toHaveBeenCalledWith('id', classroomId);
      expect(mockSingle).toHaveBeenCalled();
      expect(result?.teacherName).toBe('Prof. Minerva');
    });

    it('should return null if classroom is not found (PGRST116 error)', async () => {
      mockSupabaseFrom.mockImplementationOnce(() => ({ select: mockSelect }));
      mockSelect.mockReturnValueOnce({ eq: mockEq });
      mockEq.mockReturnValueOnce({ single: mockSingle });
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: {
          code: 'PGRST116',
          message: 'Row not found',
          details: '',
          hint: '',
        },
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
      created_at: '',
      updated_at: '',
    };
    const dbRecords = [
      {
        id: 'c1',
        teacher_id: teacherId,
        teacher: mockTeacherProfile,
        name: 'Class 1',
        students: [],
      },
    ];

    it('should retrieve paginated classrooms for a teacher', async () => {
      const countEqMock = jest
        .fn()
        .mockResolvedValue({ count: dbRecords.length, error: null });
      const dataRangeMock = jest
        .fn()
        .mockResolvedValue({ data: dbRecords, error: null });
      const dataOrderMock = jest.fn().mockReturnValue({ range: dataRangeMock });
      const dataEqMock = jest.fn().mockReturnValue({ order: dataOrderMock });

      mockSupabaseFrom.mockImplementation((tableName: string) => {
        if (tableName === 'classrooms') {
          return {
            select: jest.fn((cols, opts) => {
              if (opts?.count === 'exact') return { eq: countEqMock }; // Count query
              return { eq: dataEqMock }; // Data query
            }),
          };
        }
        return {};
      });

      const result = await getClassroomsByTeacherId(teacherId, 1, 10);
      expect(result.totalCount).toBe(dbRecords.length);
      expect(result.classrooms[0].teacherName).toBe(mockTeacherProfile.name);
    });
  });

  describe('getAllClassrooms', () => {
    const mockTeacher1 = {
      id: 't1',
      name: 'Teacher One',
      role: UserRole.TEACHER,
      email: '',
      created_at: '',
      updated_at: '',
    };
    const dbRecords = [
      {
        id: 'c1',
        name: 'Class A',
        teacher_id: 't1',
        teacher: mockTeacher1,
        student_count: [{ count: 10 }],
        created_at: '',
        updated_at: '',
      },
    ];

    it('should retrieve paginated list of all classrooms', async () => {
      const countMock = jest
        .fn()
        .mockResolvedValue({ count: dbRecords.length, error: null });
      const dataRangeMock = jest
        .fn()
        .mockResolvedValue({ data: dbRecords, error: null });
      const dataOrderMock = jest.fn().mockReturnValue({ range: dataRangeMock });

      mockSupabaseFrom.mockImplementation((tableName: string) => {
        if (tableName === 'classrooms') {
          return {
            select: jest.fn((cols, opts) => {
              if (opts?.count === 'exact') return countMock(); // Direct call for count
              return { order: dataOrderMock }; // Data query
            }),
          };
        }
        return {};
      });

      const result = await getAllClassrooms(1, 10);
      expect(result.totalCount).toBe(dbRecords.length);
      expect(result.classrooms[0].studentCount).toBe(10);
    });
  });

  describe('updateClassroom', () => {
    const classroomId = 'cUpdate1';
    const teacherId = 'tUpdate1';
    const teacherUser = {
      id: teacherId,
      role: UserRole.TEACHER,
      name: 'T. Update',
      email: '',
      created_at: '',
      updated_at: '',
    };
    const adminUser = {
      id: 'adminUpdate',
      role: UserRole.ADMIN,
      name: 'A. Update',
      email: '',
      created_at: '',
      updated_at: '',
    };
    const otherUser = {
      id: 'otherUpdate',
      role: UserRole.TEACHER,
      name: 'O. Update',
      email: '',
      created_at: '',
      updated_at: '',
    };
    const existingRecord = {
      id: classroomId,
      teacher_id: teacherId,
      name: 'Old Name',
      teacher: teacherUser,
      students: [],
      created_at: '',
      updated_at: '',
    };
    const updates = { name: 'New Name' };
    const updatedRecord = {
      ...existingRecord,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    it('should update a classroom successfully by owner', async () => {
      const getByIdSingleMock = jest
        .fn()
        .mockResolvedValue({ data: existingRecord, error: null });
      const updateSingleMock = jest
        .fn()
        .mockResolvedValue({ data: updatedRecord, error: null });

      mockSupabaseFrom.mockImplementation((tableName: string) => {
        if (tableName === 'classrooms') {
          // First call for getClassroomById, second for update
          const callCount = mockSupabaseFrom.mock.calls.filter(
            (c) => c[0] === 'classrooms'
          ).length;
          if (callCount % 2 !== 0) {
            // Odd call (1st, 3rd, etc.)
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({ single: getByIdSingleMock }),
              }),
            };
          } else {
            // Even call (2nd, 4th, etc.)
            return {
              update: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  select: jest
                    .fn()
                    .mockReturnValue({ single: updateSingleMock }),
                }),
              }),
            };
          }
        }
        return {};
      });

      const result = await updateClassroom(
        classroomId,
        updates,
        teacherId,
        UserRole.TEACHER
      );
      expect(result?.name).toBe('New Name');
    });

    it('should throw error if non-owner/non-admin tries to update', async () => {
      const getByIdSingleMock = jest
        .fn()
        .mockResolvedValue({ data: existingRecord, error: null });
      mockSupabaseFrom.mockImplementationOnce(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({ single: getByIdSingleMock }),
        }),
      }));

      await expect(
        updateClassroom(classroomId, updates, otherUser.id, otherUser.role)
      ).rejects.toThrow('User not authorized to update this classroom.');
    });
  });

  describe('deleteClassroom', () => {
    const classroomId = 'cDelete1';
    const teacherId = 'tDelete1';
    const teacherUser = {
      id: teacherId,
      role: UserRole.TEACHER,
      name: 'T. Delete',
      email: '',
      created_at: '',
      updated_at: '',
    };
    const adminUser = {
      id: 'adminDelete',
      role: UserRole.ADMIN,
      name: 'A. Delete',
      email: '',
      created_at: '',
      updated_at: '',
    };
    const existingRecord = {
      id: classroomId,
      teacher_id: teacherId,
      name: 'To Delete',
      teacher: teacherUser,
      students: [],
      created_at: '',
      updated_at: '',
    };

    it('should delete a classroom successfully by owner', async () => {
      const getByIdSingleMock = jest
        .fn()
        .mockResolvedValue({ data: existingRecord, error: null });
      const studentDeleteEqMock = jest
        .fn()
        .mockResolvedValue({ error: null, count: 0 });
      const classroomDeleteEqMock = jest
        .fn()
        .mockResolvedValue({ error: null, count: 1 });

      mockSupabaseFrom.mockImplementation((tableName: string) => {
        if (tableName === 'classrooms') {
          // First call for getClassroomById, second for classroom deletion
          const classroomCalls = mockSupabaseFrom.mock.calls.filter(
            (c) => c[0] === 'classrooms'
          );
          if (classroomCalls.length === 1)
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({ single: getByIdSingleMock }),
              }),
            };
          if (classroomCalls.length === 2)
            return {
              delete: jest.fn().mockReturnValue({ eq: classroomDeleteEqMock }),
            };
        } else if (tableName === 'classroom_students') {
          return {
            delete: jest.fn().mockReturnValue({ eq: studentDeleteEqMock }),
          };
        }
        return {};
      });

      const result = await deleteClassroom(
        classroomId,
        teacherId,
        UserRole.TEACHER
      );
      expect(result).toBe(true);
      expect(studentDeleteEqMock).toHaveBeenCalledWith(
        'classroom_id',
        classroomId
      );
      expect(classroomDeleteEqMock).toHaveBeenCalledWith('id', classroomId);
    });

    it('should throw error if classroom not found for deletion', async () => {
      const getByIdSingleMock = jest.fn().mockResolvedValue({
        data: null,
        error: {
          code: 'PGRST116',
          message: 'Not found',
          details: '',
          hint: '',
        },
      });
      mockSupabaseFrom.mockImplementationOnce(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({ single: getByIdSingleMock }),
        }),
      }));
      await expect(
        deleteClassroom(classroomId, teacherId, UserRole.TEACHER)
      ).rejects.toThrow('Classroom not found.');
    });

    it('should throw error if Supabase fails to delete students', async () => {
      const getByIdSingleMock = jest
        .fn()
        .mockResolvedValue({ data: existingRecord, error: null });
      const studentDeleteError = {
        message: 'Failed to delete students',
        code: 'SDE1',
        details: '',
        hint: '',
      };
      const studentDeleteEqMock = jest
        .fn()
        .mockResolvedValue({ error: studentDeleteError, count: null });

      mockSupabaseFrom.mockImplementation((tableName: string) => {
        if (tableName === 'classrooms')
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({ single: getByIdSingleMock }),
            }),
          };
        if (tableName === 'classroom_students')
          return {
            delete: jest.fn().mockReturnValue({ eq: studentDeleteEqMock }),
          };
        return {};
      });

      await expect(
        deleteClassroom(classroomId, teacherId, UserRole.TEACHER)
      ).rejects.toThrow(
        `Failed to delete students from classroom: ${studentDeleteError.message}`
      );
    });
  });
});
