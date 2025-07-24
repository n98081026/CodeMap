/*
import { SupabaseClient } from '@supabase/supabase-js';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  getClassroomsByTeacherId,
  getClassroomById,
  createClassroom,
  updateClassroom,
  deleteClassroom,
  addStudentToClassroom,
  removeStudentFromClassroom,
  getStudentClassrooms,
  getClassroomWithStudentDetails,
  getClassroomsWithMetrics,
} from '../classroomService';

import {
  MOCK_TEACHER_USER,
  MOCK_CLASSROOM_TEACHER_OWNED,
  MOCK_STUDENT_USER,
  MOCK_CLASSROOM_SHARED,
} from '@/lib/config';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
  rpc: vi.fn(),
} as unknown as SupabaseClient;

describe('Classroom Service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // Test getClassroomsByTeacherId
  it('should fetch classrooms for a given teacher ID', async () => {
    const fromMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [MOCK_CLASSROOM_TEACHER_OWNED], error: null }),
    };
    (mockSupabase.from as vi.Mock).mockReturnValue(fromMock);

    const classrooms = await getClassroomsByTeacherId(MOCK_TEACHER_USER.id, mockSupabase);
    expect(mockSupabase.from).toHaveBeenCalledWith('classrooms');
    expect(fromMock.select).toHaveBeenCalledWith('*');
    expect(fromMock.eq).toHaveBeenCalledWith('teacher_id', MOCK_TEACHER_USER.id);
    expect(classrooms).toEqual([MOCK_CLASSROOM_TEACHER_OWNED]);
  });

  // Test getClassroomById
  it('should fetch a single classroom by its ID', async () => {
    const fromMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: MOCK_CLASSROOM_TEACHER_OWNED, error: null }),
    };
    (mockSupabase.from as vi.Mock).mockReturnValue(fromMock);

    const classroom = await getClassroomById(MOCK_CLASSROOM_TEACHER_OWNED.id, mockSupabase);
    expect(mockSupabase.from).toHaveBeenCalledWith('classrooms');
    expect(fromMock.select).toHaveBeenCalledWith('*');
    expect(fromMock.eq).toHaveBeenCalledWith('id', MOCK_CLASSROOM_TEACHER_OWNED.id);
    expect(fromMock.single).toHaveBeenCalled();
    expect(classroom).toEqual(MOCK_CLASSROOM_TEACHER_OWNED);
  });

  // Test createClassroom
  it('should create a new classroom', async () => {
    const newClassroomData = { name: 'New CS101', description: 'Intro to CS' };
    const fromMock = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { ...newClassroomData, id: 'new-id', teacher_id: MOCK_TEACHER_USER.id }, error: null }),
    };
    (mockSupabase.from as vi.Mock).mockReturnValue(fromMock);

    const classroom = await createClassroom(newClassroomData, MOCK_TEACHER_USER.id, mockSupabase);
    expect(mockSupabase.from).toHaveBeenCalledWith('classrooms');
    expect(fromMock.insert).toHaveBeenCalledWith([{ ...newClassroomData, teacher_id: MOCK_TEACHER_USER.id }]);
    expect(classroom).toHaveProperty('id', 'new-id');
  });

  // Test updateClassroom
  it('should update an existing classroom', async () => {
    const updatedData = { name: 'Advanced CS' };
    const fromMock = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { ...MOCK_CLASSROOM_TEACHER_OWNED, ...updatedData }, error: null }),
    };
    (mockSupabase.from as vi.Mock).mockReturnValue(fromMock);

    const classroom = await updateClassroom(MOCK_CLASSROOM_TEACHER_OWNED.id, updatedData, mockSupabase);
    expect(mockSupabase.from).toHaveBeenCalledWith('classrooms');
    expect(fromMock.update).toHaveBeenCalledWith(updatedData);
    expect(fromMock.eq).toHaveBeenCalledWith('id', MOCK_CLASSROOM_TEACHER_OWNED.id);
    expect(classroom?.name).toBe('Advanced CS');
  });

  // Test deleteClassroom
  it('should delete a classroom', async () => {
    const fromMock = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    (mockSupabase.from as vi.Mock).mockReturnValue(fromMock);

    const result = await deleteClassroom(MOCK_CLASSROOM_TEACHER_OWNED.id, mockSupabase);
    expect(mockSupabase.from).toHaveBeenCalledWith('classrooms');
    expect(fromMock.delete).toHaveBeenCalled();
    expect(fromMock.eq).toHaveBeenCalledWith('id', MOCK_CLASSROOM_TEACHER_OWNED.id);
    expect(result).toBe(true);
  });

  // Test addStudentToClassroom
  it('should add a student to a classroom', async () => {
    const fromMock = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };
    (mockSupabase.from as vi.Mock).mockReturnValue(fromMock);

    const result = await addStudentToClassroom(MOCK_CLASSROOM_TEACHER_OWNED.id, MOCK_STUDENT_USER.id, mockSupabase);
    expect(mockSupabase.from).toHaveBeenCalledWith('classroom_students');
    expect(fromMock.insert).toHaveBeenCalledWith({ classroom_id: MOCK_CLASSROOM_TEACHER_OWNED.id, student_id: MOCK_STUDENT_USER.id });
    expect(result).toBe(true);
  });

  // Test removeStudentFromClassroom
  it('should remove a student from a classroom', async () => {
    const fromMock = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    (mockSupabase.from as vi.Mock).mockReturnValue(fromMock);

    const result = await removeStudentFromClassroom(MOCK_CLASSROOM_TEACHER_OWNED.id, MOCK_STUDENT_USER.id, mockSupabase);
    expect(mockSupabase.from).toHaveBeenCalledWith('classroom_students');
    expect(fromMock.delete).toHaveBeenCalled();
    // This is a simplified check. A real implementation might need to chain .eq calls.
    expect(fromMock.eq).toHaveBeenCalledWith('classroom_id', MOCK_CLASSROOM_TEACHER_OWNED.id);
    expect(fromMock.eq).toHaveBeenCalledWith('student_id', MOCK_STUDENT_USER.id);
    expect(result).toBe(true);
  });

  // Test getStudentClassrooms
  it('should fetch classrooms for a student', async () => {
    const fromMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [{ classrooms: MOCK_CLASSROOM_SHARED }], error: null }),
    };
    (mockSupabase.from as vi.Mock).mockReturnValue(fromMock);

    const classrooms = await getStudentClassrooms(MOCK_STUDENT_USER.id, mockSupabase);
    expect(mockSupabase.from).toHaveBeenCalledWith('classroom_students');
    expect(fromMock.select).toHaveBeenCalledWith('classrooms(*)');
    expect(fromMock.eq).toHaveBeenCalledWith('student_id', MOCK_STUDENT_USER.id);
    expect(classrooms).toEqual([MOCK_CLASSROOM_SHARED]);
  });

  // Test getClassroomWithStudentDetails
  it('should fetch a classroom with detailed student info', async () => {
    const classroomWithStudents = {
      ...MOCK_CLASSROOM_TEACHER_OWNED,
      students: [MOCK_STUDENT_USER],
    };
    const fromMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: classroomWithStudents, error: null }),
    };
    (mockSupabase.from as vi.Mock).mockReturnValue(fromMock);

    const classroom = await getClassroomWithStudentDetails(MOCK_CLASSROOM_TEACHER_OWNED.id, mockSupabase);
    expect(mockSupabase.from).toHaveBeenCalledWith('classrooms');
    expect(fromMock.select).toHaveBeenCalledWith('*, students:users(*)');
    expect(fromMock.eq).toHaveBeenCalledWith('id', MOCK_CLASSROOM_TEACHER_OWNED.id);
    expect(classroom?.students).toEqual([MOCK_STUDENT_USER]);
  });

  // Test getClassroomsWithMetrics
  it('should fetch classrooms with metrics using RPC', async () => {
    const mockMetrics = [{ id: 'class-1', name: 'CS101', student_count: 25, concept_map_count: 10, submission_count: 5, active_students: 20 }];
    (mockSupabase.rpc as vi.Mock).mockResolvedValue({ data: mockMetrics, error: null });

    const metrics = await getClassroomsWithMetrics(MOCK_TEACHER_USER.id, mockSupabase);
    expect(mockSupabase.rpc).toHaveBeenCalledWith('get_teacher_classroom_metrics', { p_teacher_id: MOCK_TEACHER_USER.id });
    expect(metrics).toEqual(mockMetrics);
  });
});
*/
export {};
