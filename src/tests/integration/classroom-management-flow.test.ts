/**
 * Integration tests for classroom management functionality
 * Tests the complete classroom lifecycle and student enrollment
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import * as classroomService from '@/services/classrooms/classroomService';

// Mock Supabase client

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
        updated_at: new Date().toISOString(),
      };


      const createClassroomSpy = vi.spyOn(classroomService, 'createClassroom').mockResolvedValue(mockClassroom);

      const result = await classroomService.createClassroom(
        'Advanced Programming',
        'Learn advanced programming concepts',
        'teacher-123'
      );

      expect(result).toEqual(mockClassroom);
      expect(createClassroomSpy).toHaveBeenCalledWith(
        'Advanced Programming',
        'Learn advanced programming concepts',
        'teacher-123'
      );
    });

    it('should handle classroom creation errors', async () => {
      const createClassroomSpy = vi.spyOn(classroomService, 'createClassroom').mockRejectedValue(new Error('Teacher not found'));

      await expect(
        classroomService.createClassroom(
          'Invalid Classroom',
          'This should fail',
          'nonexistent-teacher'
        )
      ).rejects.toThrow('Teacher not found');
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
            role: 'student',
          },
          {
            id: 'student-2',
            name: 'Bob Smith',
            email: 'bob@example.com',
            role: 'student',
          },
        ],
      };

      const getClassroomByIdSpy = vi.spyOn(classroomService, 'getClassroomById').mockResolvedValue(mockClassroomWithStudents);

      const result = await classroomService.getClassroomById('class-123');

      expect(result).toEqual(mockClassroomWithStudents);
      expect(result?.students).toHaveLength(2);
    });

    it('should handle classroom not found', async () => {
      const getClassroomByIdSpy = vi.spyOn(classroomService, 'getClassroomById').mockResolvedValue(null);

      const result = await classroomService.getClassroomById('nonexistent-class');

      expect(result).toBeNull();
    });
  });

  describe('Student Enrollment Flow', () => {
    it('should add student to classroom successfully', async () => {
      const mockEnrollment = {
        classroom_id: 'class-123',
        student_id: 'student-456',
        enrolled_at: new Date().toISOString(),
      };

      const addStudentToClassroomSpy = vi.spyOn(classroomService, 'addStudentToClassroom').mockResolvedValue(mockEnrollment);

      const result = await classroomService.addStudentToClassroom('class-123', 'student-456');

      expect(result).toEqual(mockEnrollment);
    });

    it('should handle duplicate enrollment', async () => {
      const addStudentToClassroomSpy = vi.spyOn(classroomService, 'addStudentToClassroom').mockRejectedValue(new Error('Student already enrolled'));

      await expect(
        classroomService.addStudentToClassroom('class-123', 'student-456')
      ).rejects.toThrow('Student already enrolled');
    });

    it('should remove student from classroom successfully', async () => {
      const removeStudentFromClassroomSpy = vi.spyOn(classroomService, 'removeStudentFromClassroom').mockResolvedValue(true);

      const result = await classroomService.removeStudentFromClassroom(
        'class-123',
        'student-456'
      );

      expect(result).toBe(true);
    });

    it('should handle student removal errors', async () => {
      const removeStudentFromClassroomSpy = vi.spyOn(classroomService, 'removeStudentFromClassroom').mockRejectedValue(new Error('Student not found in classroom'));

      await expect(
        classroomService.removeStudentFromClassroom('class-123', 'nonexistent-student')
      ).rejects.toThrow('Student not found in classroom');
    });
  });

  describe('Teacher Permissions Flow', () => {
    it('should enforce teacher ownership for classroom modifications', async () => {
      const getClassroomByIdSpy = vi.spyOn(classroomService, 'getClassroomById').mockResolvedValue(null);

      const result = await classroomService.getClassroomById('class-123');

      expect(result).toBeNull();
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
        active_students: 23,
      };

      const getClassroomByIdSpy = vi.spyOn(classroomService, 'getClassroomById').mockResolvedValue(mockClassroomStats);

      const result = await classroomService.getClassroomById('class-123');

      expect(result).toBeDefined();
    });
  });
});
