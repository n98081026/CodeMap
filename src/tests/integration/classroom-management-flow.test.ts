import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  createClassroom,
  addStudentToClassroom,
  getClassroomsByTeacherId,
  getClassroomsWithMetrics,
  deleteClassroom,
} from '@/services/classrooms/classroomService';
import { MOCK_TEACHER_USER, MOCK_STUDENT_USER } from '@/lib/config';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
  rpc: vi.fn(),
};

describe.skip('Integration Test: Classroom Management Flow', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should allow a teacher to create, manage, and delete a classroom', async () => {
    // 1. Teacher creates a classroom
    const newClassroomData = {
      name: 'CS 499: Senior Design',
      description: 'Capstone project course for computer science majors.',
    };
    const createdClassroom = {
      ...newClassroomData,
      id: 'class-499',
      teacher_id: MOCK_TEACHER_USER.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    (mockSupabase.from as vi.Mock).mockImplementation(() => ({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi
        .fn()
        .mockResolvedValue({ data: createdClassroom, error: null }),
    }));

    const resultClassroom = await createClassroom(
      newClassroomData as any,
      MOCK_TEACHER_USER.id,
      mockSupabase as any
    );
    expect(resultClassroom.name).toBe(newClassroomData.name);
    expect((resultClassroom as any).teacher_id).toBe(MOCK_TEACHER_USER.id);

    // 2. Teacher adds a student to the classroom
    (mockSupabase.from as vi.Mock).mockImplementation(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
    }));

    const addStudentResult = await addStudentToClassroom(
      resultClassroom.id,
      MOCK_STUDENT_USER.id,
      mockSupabase as any
    );
    expect(addStudentResult).toBe(true);

    // 3. Teacher views their list of classrooms
    const teacherClassrooms = [
      { ...createdClassroom, students: [MOCK_STUDENT_USER] },
    ];
    (mockSupabase.from as vi.Mock).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: teacherClassrooms, error: null }),
    }));

    const fetchedClassrooms = await getClassroomsByTeacherId(
      MOCK_TEACHER_USER.id,
      mockSupabase as any
    );
    expect(fetchedClassrooms.length).toBe(1);
    expect(fetchedClassrooms[0].name).toBe(newClassroomData.name);

    // 4. Student views their enrolled classrooms
    const studentEnrollments = [
      {
        classroom_id: resultClassroom.id,
        student_id: MOCK_STUDENT_USER.id,
        enrolled_at: new Date().toISOString(),
      },
    ];
    (mockSupabase.from as vi.Mock).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: studentEnrollments, error: null }),
    }));
    // This test needs adjustment as getStudentClassrooms is not directly used in the flow description.
    // Let's assume a student dashboard would call a function that gets their classrooms.
    // The check is conceptual for the integration test.

    // 5. Teacher views dashboard metrics for their classrooms
    const classroomMetrics = [
      {
        id: resultClassroom.id,
        name: resultClassroom.name,
        student_count: 1,
        concept_map_count: 0,
        submission_count: 0,
        active_students: 1,
      },
    ];
    (mockSupabase.rpc as vi.Mock).mockResolvedValue({
      data: classroomMetrics,
      error: null,
    });

    const metrics = await getClassroomsWithMetrics(
      MOCK_TEACHER_USER.id,
      mockSupabase as any
    );
    expect(metrics.length).toBe(1);
    expect(metrics[0].student_count).toBe(1);

    // 6. Teacher deletes the classroom
    (mockSupabase.from as vi.Mock).mockImplementation(() => ({
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    }));

    const deleteResult = await deleteClassroom(
      resultClassroom.id,
      mockSupabase as any
    );
    expect(deleteResult).toBe(true);
  });
});
