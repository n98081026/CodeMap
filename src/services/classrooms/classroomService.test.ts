// src/services/classrooms/classroomService.test.ts
import { createClassroom, getClassroomById, getClassroomsByTeacherId, getAllClassrooms } from './classroomService'; // Added getAllClassrooms
import { supabase } from '@/lib/supabaseClient';
import { getUserById } from '@/services/users/userService';
import { UserRole, type User, type Classroom } from '@/types';

// Mock the modules
jest.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn(),
  },
}));

jest.mock('@/services/users/userService', () => ({
  getUserById: jest.fn(),
}));

describe('classroomService', () => {
  const mockSupabaseFrom = supabase.from as jest.Mock;
  const mockGetUserById = getUserById as jest.Mock;

  let mockCreateSupabaseInsert: jest.Mock;
  let mockCreateSupabaseSelect: jest.Mock;
  let mockCreateSupabaseSingle: jest.Mock;

  let mockGetByIdSupabaseSelect: jest.Mock;
  let mockGetByIdSupabaseEq: jest.Mock;
  let mockGetByIdSupabaseSingle: jest.Mock;

  let mockGetByTeacherIdSupabaseSelect: jest.Mock;
  let mockGetByTeacherIdSupabaseEq: jest.Mock;
  let mockGetByTeacherIdSupabaseOrder: jest.Mock;
  let mockGetByTeacherIdSupabaseRange: jest.Mock;

  // Mocks for getAllClassrooms (can share some general mocks like .from)
  let mockGetAllSupabaseSelect: jest.Mock;
  let mockGetAllSupabaseOrder: jest.Mock;
  let mockGetAllSupabaseRange: jest.Mock;


  beforeEach(() => {
    jest.clearAllMocks();

    // Setup for createClassroom
    mockCreateSupabaseInsert = jest.fn().mockReturnThis();
    mockCreateSupabaseSelect = jest.fn().mockReturnThis();
    mockCreateSupabaseSingle = jest.fn();

    // Setup for getClassroomById
    mockGetByIdSupabaseSelect = jest.fn().mockReturnThis();
    mockGetByIdSupabaseEq = jest.fn().mockReturnThis();
    mockGetByIdSupabaseSingle = jest.fn();

    // Setup for getClassroomsByTeacherId
    mockGetByTeacherIdSupabaseSelect = jest.fn().mockReturnThis();
    mockGetByTeacherIdSupabaseEq = jest.fn().mockReturnThis();
    mockGetByTeacherIdSupabaseOrder = jest.fn().mockReturnThis();
    mockGetByTeacherIdSupabaseRange = jest.fn();

    // Setup for getAllClassrooms
    mockGetAllSupabaseSelect = jest.fn().mockReturnThis();
    mockGetAllSupabaseOrder = jest.fn().mockReturnThis();
    mockGetAllSupabaseRange = jest.fn();


    // Default implementation for supabase.from, can be overridden by specific mock chains in tests
    mockSupabaseFrom.mockImplementation(() => ({
      insert: mockCreateSupabaseInsert, // for createClassroom
      select: jest.fn().mockReturnThis(), // generic select, tests will refine
      eq: jest.fn().mockReturnThis(),     // generic eq
      order: jest.fn().mockReturnThis(),  // generic order
      range: jest.fn().mockReturnThis(),  // generic range
      single: jest.fn(),                  // generic single
    }));

    // Chain setup for createClassroom
    mockCreateSupabaseInsert.mockReturnValue({ select: mockCreateSupabaseSelect });
    mockCreateSupabaseSelect.mockReturnValue({ single: mockCreateSupabaseSingle });

    // Chain setup for getClassroomById
    // Use a more specific select mock for this path if needed, or control via from().select()
    // This is tricky because select is called by multiple functions.
    // It's better to set up specific chains per test or per describe block for `from().select()`

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
      mockSupabaseFrom.mockImplementationOnce(() => ({
        insert: mockCreateSupabaseInsert.mockImplementationOnce(() => ({
          select: mockCreateSupabaseSelect.mockImplementationOnce(() => ({
            single: mockCreateSupabaseSingle.mockResolvedValueOnce({ data: supabaseClassroomRecord, error: null }),
          })),
        })),
      }));

      const result = await createClassroom(
        classroomInput.name,
        classroomInput.description,
        classroomInput.teacherId
      );

      expect(mockGetUserById).toHaveBeenCalledWith(classroomInput.teacherId);
      expect(mockSupabaseFrom).toHaveBeenCalledWith('classrooms');
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
        inviteCode: supabaseClassroomRecord.invite_code,
      }));
      expect(result.inviteCode).toHaveLength(6);
    });

    it('should throw an error if teacherId is invalid or user is not a teacher', async () => {
      mockGetUserById.mockResolvedValue(null);
      await expect(createClassroom(classroomInput.name, classroomInput.description, 'invalid-teacher-id'))
        .rejects.toThrow('Invalid teacher ID. User does not exist or is not a teacher.');
      // expect(mockSupabaseFrom).not.toHaveBeenCalled(); // from might be called before getUserById in some setups
    });

    it('should throw an error if user is not a teacher', async () => {
      mockGetUserById.mockResolvedValue({ ...teacherUser, role: UserRole.STUDENT });
      await expect(createClassroom(classroomInput.name, classroomInput.description, teacherUser.id))
        .rejects.toThrow('Invalid teacher ID. User does not exist or is not a teacher.');
    });

    it('should throw an error if Supabase insert fails', async () => {
      mockGetUserById.mockResolvedValue(teacherUser);
      const supabaseError = { message: 'Supabase insert error', code: '12345', details: '', hint: '' };
      mockSupabaseFrom.mockImplementationOnce(() => ({
        insert: mockCreateSupabaseInsert.mockImplementationOnce(() => ({
          select: mockCreateSupabaseSelect.mockImplementationOnce(() => ({
            single: mockCreateSupabaseSingle.mockResolvedValueOnce({ data: null, error: supabaseError }),
          })),
        })),
      }));
      await expect(createClassroom(classroomInput.name, classroomInput.description, classroomInput.teacherId))
        .rejects.toThrow(`Failed to create classroom: ${supabaseError.message}`);
    });

    it('should throw an error if Supabase returns no data after insert', async () => {
      mockGetUserById.mockResolvedValue(teacherUser);
      mockSupabaseFrom.mockImplementationOnce(() => ({
         insert: mockCreateSupabaseInsert.mockImplementationOnce(() => ({
          select: mockCreateSupabaseSelect.mockImplementationOnce(() => ({
            single: mockCreateSupabaseSingle.mockResolvedValueOnce({ data: null, error: null }),
          })),
        })),
      }));
      await expect(createClassroom(classroomInput.name, classroomInput.description, classroomInput.teacherId))
        .rejects.toThrow('Failed to create classroom: No data returned.');
    });

    it('should generate a 6-character invite code', async () => {
      mockGetUserById.mockResolvedValue(teacherUser);
      const generatedInviteCode = 'AB7DE1';
       mockSupabaseFrom.mockImplementationOnce(() => ({
        insert: mockCreateSupabaseInsert.mockImplementationOnce(() => ({
          select: mockCreateSupabaseSelect.mockImplementationOnce(() => ({
            single: mockCreateSupabaseSingle.mockResolvedValueOnce({ data: { ...supabaseClassroomRecord, invite_code: generatedInviteCode }, error: null }),
          })),
        })),
      }));

      const result = await createClassroom(classroomInput.name, classroomInput.description, classroomInput.teacherId);
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
      teacher: { id: 'teacher1', name: 'Prof. Minerva', email: 'minerva@hogwarts.edu', role: UserRole.TEACHER, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      students: [
        { user_id: 'student1', profiles: { id: 'student1', name: 'Harry Potter', email: 'harry@hogwarts.edu', role: UserRole.STUDENT, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }},
        { user_id: 'student2', profiles: { id: 'student2', name: 'Hermione Granger', email: 'hermione@hogwarts.edu', role: UserRole.STUDENT, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }}
      ]
    };

    it('should retrieve a classroom successfully by ID and map joined data', async () => {
      const singleMock = jest.fn().mockResolvedValue({ data: mockSupabaseResponse, error: null });
      const eqMock = jest.fn().mockReturnValue({ single: singleMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
      mockSupabaseFrom.mockImplementationOnce(() => ({ select: selectMock }));

      const result = await getClassroomById(classroomId);

      expect(mockSupabaseFrom).toHaveBeenCalledWith('classrooms');
      expect(selectMock).toHaveBeenCalledWith('*, students:classroom_students(user_id, profiles:users(id, name, email, role)), teacher:profiles!classrooms_teacher_id_fkey(id, name, email, role)');
      expect(eqMock).toHaveBeenCalledWith('id', classroomId);
      expect(singleMock).toHaveBeenCalled();

      expect(result).not.toBeNull();
      expect(result?.id).toBe(classroomId);
      expect(result?.teacherName).toBe(mockSupabaseResponse.teacher.name);
      expect(result?.students).toHaveLength(2);
    });

    it('should return null if classroom is not found (PGRST116 error)', async () => {
      const singleMock = jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'Row not found', details: '', hint: '' } });
      const eqMock = jest.fn().mockReturnValue({ single: singleMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
      mockSupabaseFrom.mockImplementationOnce(() => ({ select: selectMock }));
      const result = await getClassroomById(classroomId);
      expect(result).toBeNull();
    });

    it('should return null if classroom is not found (no data, no error)', async () => {
      const singleMock = jest.fn().mockResolvedValue({ data: null, error: null });
      const eqMock = jest.fn().mockReturnValue({ single: singleMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
      mockSupabaseFrom.mockImplementationOnce(() => ({ select: selectMock }));
      const result = await getClassroomById(classroomId);
      expect(result).toBeNull();
    });

    it('should throw an error if Supabase select fails (non-PGRST116 error)', async () => {
      const supabaseError = { message: 'Supabase select error', code: 'XYZ01', details: '', hint: '' };
      const singleMock = jest.fn().mockResolvedValue({ data: null, error: supabaseError });
      const eqMock = jest.fn().mockReturnValue({ single: singleMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
      mockSupabaseFrom.mockImplementationOnce(() => ({ select: selectMock }));
      await expect(getClassroomById(classroomId)).rejects.toThrow(`Failed to fetch classroom details: ${supabaseError.message}`);
    });

    it('should handle classroom with no students correctly', async () => {
        const responseNoStudents = { ...mockSupabaseResponse, students: [] };
        const singleMock = jest.fn().mockResolvedValue({ data: responseNoStudents, error: null });
        const eqMock = jest.fn().mockReturnValue({ single: singleMock });
        const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
        mockSupabaseFrom.mockImplementationOnce(() => ({ select: selectMock }));
        const result = await getClassroomById(classroomId);
        expect(result?.students).toEqual([]);
    });

    it('should handle classroom with no teacher joined', async () => {
        const responseNoTeacher = { ...mockSupabaseResponse, teacher: null };
        const singleMock = jest.fn().mockResolvedValue({ data: responseNoTeacher, error: null });
        const eqMock = jest.fn().mockReturnValue({ single: singleMock });
        const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
        mockSupabaseFrom.mockImplementationOnce(() => ({ select: selectMock }));
        const result = await getClassroomById(classroomId);
        expect(result?.teacherName).toBeNull();
    });
  });

  describe('getClassroomsByTeacherId', () => {
    const teacherId = 'teacherWithClasses';
    const mockTeacherProfile = { id: teacherId, name: 'Prof. Minerva', email: 'minerva@hogwarts.edu', role: UserRole.TEACHER, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };

    const dbClassroomRecords = [
      { id: 'c1', name: 'Potions Basics', teacher_id: teacherId, subject: 'Potions', difficulty: 'beginner', invite_code: 'POT101', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), teacher: mockTeacherProfile, students: [] },
      { id: 'c2', name: 'Advanced Charms', teacher_id: teacherId, subject: 'Charms', difficulty: 'advanced', invite_code: 'CHM202', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), teacher: mockTeacherProfile, students: [] },
      { id: 'c3', name: 'Herbology 101', teacher_id: teacherId, subject: 'Herbology', difficulty: 'beginner', invite_code: 'HERB101', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), teacher: mockTeacherProfile, students: [] },
    ];

    const setupMocksForGetByTeacherId = (countResult: any, dataResult: any, isPaginated: boolean = false) => {
        const eqForCountMock = jest.fn().mockResolvedValue(countResult);
        const selectForCountMock = jest.fn((selectCols, opts) => {
            if (opts && opts.count === 'exact' && opts.head === true) return { eq: eqForCountMock };
            return {};
        });

        const rangeMock = jest.fn().mockResolvedValue(dataResult);
        const orderMock = jest.fn(() => (isPaginated ? { range: rangeMock } : Promise.resolve(dataResult)));

        const eqForDataMock = jest.fn().mockReturnValue({ order: orderMock });
        const selectForDataMock = jest.fn(() => ({ eq: eqForDataMock }));

        mockSupabaseFrom
            .mockImplementationOnce(() => ({ select: selectForCountMock }))
            .mockImplementationOnce(() => ({ select: selectForDataMock }));

        return { selectForCountMock, eqForCountMock, selectForDataMock, eqForDataMock, orderMock, rangeMock };
    };

    it('should retrieve paginated classrooms for a teacher successfully', async () => {
      const page = 1;
      const limit = 2;
      const expectedTotalCount = dbClassroomRecords.length;
      const paginatedData = dbClassroomRecords.slice((page - 1) * limit, page * limit);

      const mocks = setupMocksForGetByTeacherId(
        { count: expectedTotalCount, error: null },
        { data: paginatedData, error: null },
        true
      );

      const result = await getClassroomsByTeacherId(teacherId, page, limit);

      expect(mockSupabaseFrom).toHaveBeenCalledWith('classrooms');
      expect(mocks.selectForCountMock).toHaveBeenCalledWith('*', { count: 'exact', head: true });
      expect(mocks.eqForCountMock).toHaveBeenCalledWith('teacher_id', teacherId);

      expect(mocks.selectForDataMock).toHaveBeenCalledWith('*, teacher:profiles!classrooms_teacher_id_fkey(id, name, email, role)');
      expect(mocks.eqForDataMock).toHaveBeenCalledWith('teacher_id', teacherId);
      expect(mocks.orderMock).toHaveBeenCalledWith('updated_at', { ascending: false });
      expect(mocks.rangeMock).toHaveBeenCalledWith((page - 1) * limit, page * limit - 1);

      expect(result.totalCount).toBe(expectedTotalCount);
      expect(result.classrooms).toHaveLength(limit);
      expect(result.classrooms[0].teacherName).toBe(mockTeacherProfile.name);
    });

    it('should retrieve all classrooms for a teacher if no pagination params are provided', async () => {
      const expectedTotalCount = dbClassroomRecords.length;
      const mocks = setupMocksForGetByTeacherId(
        { count: expectedTotalCount, error: null },
        { data: dbClassroomRecords, error: null },
        false
      );

      const result = await getClassroomsByTeacherId(teacherId);

      expect(mocks.orderMock).toHaveBeenCalled();
      expect(mocks.rangeMock).not.toHaveBeenCalled();
      expect(result.totalCount).toBe(expectedTotalCount);
      expect(result.classrooms).toHaveLength(expectedTotalCount);
    });

    it('should return empty array and zero count if no classrooms found', async () => {
      setupMocksForGetByTeacherId({ count: 0, error: null }, { data: [], error: null }, false);
      const result = await getClassroomsByTeacherId('unknownTeacher');
      expect(result.totalCount).toBe(0);
      expect(result.classrooms).toHaveLength(0);
    });

    it('should throw an error if count query fails', async () => {
      const countError = { message: 'Count query failed', code: 'ERR_COUNT', details: '', hint: '' };
      setupMocksForGetByTeacherId({ count: null, error: countError }, {}, false);
      await expect(getClassroomsByTeacherId(teacherId)).rejects.toThrow(`Failed to count classrooms for teacher: ${countError.message}`);
    });

    it('should throw an error if data query fails', async () => {
      const dataError = { message: 'Data query failed', code: 'ERR_DATA', details: '', hint: '' };
      setupMocksForGetByTeacherId({ count: 3, error: null }, { data: null, error: dataError }, false);
      await expect(getClassroomsByTeacherId(teacherId)).rejects.toThrow(`Failed to fetch classrooms for teacher: ${dataError.message}`);
    });
  });

  describe('classroomService - getAllClassrooms', () => {
    const mockAdminProfile = { id: 'adminUser', name: 'Principal Skinner', email: 'skinner@springfield.edu', role: UserRole.ADMIN, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const mockTeacher1Profile = { id: 'teacher1', name: 'Ms. Krabappel', email: 'edna@springfield.edu', role: UserRole.TEACHER, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const mockTeacher2Profile = { id: 'teacher2', name: 'Mr. Hoover', email: 'elizabeth@springfield.edu', role: UserRole.TEACHER, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };

    const dbClassroomRecords = [
        { id: 'c1', name: 'Grade 4 Math', teacher_id: 'teacher1', subject: 'Math', difficulty: 'beginner', invite_code: 'MTH401', created_at: new Date(2023, 0, 15).toISOString(), updated_at: new Date(2023, 0, 16).toISOString(), teacher: mockTeacher1Profile, student_count: [{ count: 25 }] },
        { id: 'c2', name: 'Grade 5 English', teacher_id: 'teacher2', subject: 'English', difficulty: 'intermediate', invite_code: 'ENG501', created_at: new Date(2023, 0, 10).toISOString(), updated_at: new Date(2023, 0, 12).toISOString(), teacher: mockTeacher2Profile, student_count: [{ count: 22 }] },
        { id: 'c3', name: 'Grade 4 Science', teacher_id: 'teacher1', subject: 'Science', difficulty: 'beginner', invite_code: 'SCI401', created_at: new Date(2023, 0, 20).toISOString(), updated_at: new Date(2023, 0, 20).toISOString(), teacher: mockTeacher1Profile, student_count: [{ count: 20 }] },
    ];

    const setupMocksForGetAll = (countResult: any, dataResult: any, isPaginated: boolean = true) => {
        const selectForCountMock = jest.fn().mockResolvedValue(countResult); // This is simplified, Supabase select with head returns a promise directly

        const rangeMock = jest.fn().mockResolvedValue(dataResult);
        const orderMock = jest.fn(() => (isPaginated ? { range: rangeMock } : Promise.resolve(dataResult)));
        const selectForDataMock = jest.fn(() => ({ order: orderMock }));

        mockSupabaseFrom.mockImplementation((tableName: string) => {
            if (tableName === 'classrooms') {
                // Determine if it's a count or data query based on select arguments pattern
                // This is a common pattern for Supabase count/data fetches in services.
                // First call is count, second is data.
                if (mockSupabaseFrom.mock.calls.filter(call => call[0] === 'classrooms').length % 2 !== 0) { // Odd calls are count
                    return { select: jest.fn((cols, opts) => {
                        if (opts && opts.count === 'exact' && opts.head === true) return Promise.resolve(countResult);
                        return Promise.resolve({ data: null, error: {message: "Mock select for count not matched"}}); // Should not happen
                    })};
                } else { // Even calls are data
                    return { select: selectForDataMock };
                }
            }
            return {};
        });
        return { selectForCountMock, selectForDataMock, orderMock, rangeMock };
    };


    it('should retrieve paginated list of all classrooms successfully', async () => {
        const page = 1;
        const limit = 2;
        const expectedTotalCount = dbClassroomRecords.length;
        const paginatedData = dbClassroomRecords.slice((page - 1) * limit, page * limit);

        const { orderMock, rangeMock } = setupMocksForGetAll(
            { count: expectedTotalCount, error: null },
            { data: paginatedData, error: null },
            true
        );

        const result = await getAllClassrooms(page, limit);

        expect(mockSupabaseFrom).toHaveBeenCalledWith('classrooms'); // Called twice
        // First call to from('classrooms') for count
        const firstFromCallInstance = mockSupabaseFrom.mock.results[0].value;
        expect(firstFromCallInstance.select).toHaveBeenCalledWith('*', { count: 'exact', head: true });

        // Second call to from('classrooms') for data
        const secondFromCallInstance = mockSupabaseFrom.mock.results[1].value;
        expect(secondFromCallInstance.select).toHaveBeenCalledWith('*, teacher:profiles!classrooms_teacher_id_fkey(id, name, email, role), student_count:classroom_students(count)');
        expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false });
        expect(rangeMock).toHaveBeenCalledWith((page - 1) * limit, page * limit - 1);

        expect(result.totalCount).toBe(expectedTotalCount);
        expect(result.classrooms).toHaveLength(limit);
        expect(result.classrooms[0].id).toBe(dbClassroomRecords[0].id);
        expect(result.classrooms[0].teacherName).toBe(dbClassroomRecords[0].teacher.name);
        expect(result.classrooms[0].studentCount).toBe(dbClassroomRecords[0].student_count[0].count);
    });

    it('should use default pagination if page/limit are not provided', async () => {
        const defaultLimit = 10;
        const expectedTotalCount = dbClassroomRecords.length;
        const paginatedData = dbClassroomRecords.slice(0, defaultLimit);

        const { rangeMock } = setupMocksForGetAll(
            { count: expectedTotalCount, error: null },
            { data: paginatedData, error: null },
            true // still paginated by default
        );

        await getAllClassrooms(); // Call with no args

        expect(rangeMock).toHaveBeenCalledWith(0, defaultLimit - 1);
    });

    it('should return empty array and zero count if no classrooms exist', async () => {
        setupMocksForGetAll(
            { count: 0, error: null },
            { data: [], error: null },
            true
        );
        const result = await getAllClassrooms();
        expect(result.totalCount).toBe(0);
        expect(result.classrooms).toHaveLength(0);
    });

    it('should throw an error if count query fails in getAllClassrooms', async () => {
        const countError = { message: 'Count failed', code: 'ERR_COUNT_ALL', details: '', hint: '' };
        setupMocksForGetAll({ count: null, error: countError }, {}, true);

        await expect(getAllClassrooms()).rejects.toThrow(`Failed to count all classrooms: ${countError.message}`);
    });

    it('should throw an error if data query fails in getAllClassrooms', async () => {
        const dataError = { message: 'Data query failed for all', code: 'ERR_DATA_ALL', details: '', hint: '' };
        setupMocksForGetAll(
            { count: 3, error: null }, // Count succeeds
            { data: null, error: dataError }, // Data query fails
            true
        );
        await expect(getAllClassrooms()).rejects.toThrow(`Failed to fetch all classrooms: ${dataError.message}`);
    });
  });
});
