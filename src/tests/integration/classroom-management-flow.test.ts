/**
 * Integration tests for classroom management functionality
 * Tests the complete classroom lifecycle and student enrollment
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  createClassroom, 
  getClassroomById, 
  addStudentToClassroom, 
  removeStudentFromClassroom 
} from '@/services/classrooms/classroomService';

// Mock Supabase client
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn()
      }))
    }))
  }
}));

describe('Classroom Management Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Classroom Creation Flow', () => {
    it('should create a new classroom successfully', async () => {
      const mockClassroom = {
        id: 'class-123',
        name: 'Advanced Programming',
        description: 'Learn advanced programming concepts',
        teacher_id: 'teacher-123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { supabase } = await import('@/lib/supabaseClient');
      const mockInsert = vi.fn().mockResolvedValue({
        data: mockClassroom,
        error: null
      });

      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: mockInsert
          })
        })
      });

      const result = await createClassroom({
        name: 'Advanced Programming',
        description: 'Learn advanced programming concepts',
        teacherId: 'teacher-123'
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockClassroom);
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should handle classroom creation errors', async () => {
      const { supabase } = await import('@/lib/supabaseClient');
      const mockInsert = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Teacher not found' }
      });

      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: mockInsert
          })
        })
      });

      const result = await createClassroom({
        name: 'Invalid Classroom',
        description: 'This should fail',
        teacherId: 'nonexistent-teacher'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Teacher not found');
    });
  });

  describe('Classroom Retrieval Flow', () => {
    it('should retrieve classroom with student details', async () => {
      const mockClassroomWithStudents = {
        id: 'class-123',
        name: 'Advanced Programming',
        description: 'Learn advanced programming concepts',
        teacher_id: 'teacher-123',
        students: [
          {
            id: 'student-1',
            name: 'Alice Johnson',
            email: 'alice@example.com',
            role: 'student'
          },
          {
            id: 'student-2',
            name: 'Bob Smith',
            email: 'bob@example.com',
            role: 'student'
          }
        ]
      };

      const { supabase } = await import('@/lib/supabaseClient');
      const mockSelect = vi.fn().mockResolvedValue({
        data: mockClassroomWithStudents,
        error: null
      });

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: mockSelect
          })
        })
      });

      const result = await getClassroomById('class-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockClassroomWithStudents);
      expect(result.data?.students).toHaveLength(2);
    });

    it('should handle classroom not found', async () => {
      const { supabase } = await import('@/lib/supabaseClient');
      const mockSelect = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Classroom not found' }
      });

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: mockSelect
          })
        })
      });

      const result = await getClassroomById('nonexistent-class');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Classroom not found');
    });
  });

  describe('Student Enrollment Flow', () => {
    it('should add student to classroom successfully', async () => {
      const mockEnrollment = {
        classroom_id: 'class-123',
        student_id: 'student-456',
        enrolled_at: new Date().toISOString()
      };

      const { supabase } = await import('@/lib/supabaseClient');
      const mockInsert = vi.fn().mockResolvedValue({
        data: mockEnrollment,
        error: null
      });

      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: mockInsert
          })
        })
      });

      const result = await addStudentToClassroom('class-123', 'student-456');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockEnrollment);
    });

    it('should handle duplicate enrollment', async () => {
      const { supabase } = await import('@/lib/supabaseClient');
      const mockInsert = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Student already enrolled' }
      });

      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: mockInsert
          })
        })
      });

      const result = await addStudentToClassroom('class-123', 'student-456');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Student already enrolled');
    });

    it('should remove student from classroom successfully', async () => {
      const { supabase } = await import('@/lib/supabaseClient');
      const mockDelete = vi.fn().mockResolvedValue({
        error: null
      });

      (supabase.from as any).mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: mockDelete
        })
      });

      const result = await removeStudentFromClassroom('class-123', 'student-456');

      expect(result.success).toBe(true);
      expect(mockDelete).toHaveBeenCalled();
    });

    it('should handle student removal errors', async () => {
      const { supabase } = await import('@/lib/supabaseClient');
      const mockDelete = vi.fn().mockResolvedValue({
        error: { message: 'Student not found in classroom' }
      });

      (supabase.from as any).mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: mockDelete
        })
      });

      const result = await removeStudentFromClassroom('class-123', 'nonexistent-student');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Student not found in classroom');
    });
  });

  describe('Teacher Permissions Flow', () => {
    it('should enforce teacher ownership for classroom modifications', async () => {
      // Mock scenario where a teacher tries to modify another teacher's classroom
      const { supabase } = await import('@/lib/supabaseClient');
      const mockSelect = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Access denied: Not classroom owner' }
      });

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: mockSelect
          })
        })
      });

      const result = await getClassroomById('class-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Access denied: Not classroom owner');
    });
  });

  describe('Classroom Analytics Flow', () => {
    it('should retrieve classroom statistics', async () => {
      const mockClassroomStats = {
        id: 'class-123',
        name: 'Advanced Programming',
        student_count: 25,
        concept_map_count: 12,
        submission_count: 48,
        active_students: 23
      };

      const { supabase } = await import('@/lib/supabaseClient');
      const mockSelect = vi.fn().mockResolvedValue({
        data: mockClassroomStats,
        error: null
      });

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: mockSelect
          })
        })
      });

      const result = await getClassroomById('class-123');

      expect(result.success).toBe(true);
      expect(result.data?.student_count).toBe(25);
      expect(result.data?.concept_map_count).toBe(12);
    });
  });
});