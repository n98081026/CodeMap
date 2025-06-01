// src/services/classrooms/classroomService.ts
'use server';

/**
 * @fileOverview Classroom service for handling classroom-related operations.
 */

import type { Classroom, User } from '@/types';
import { UserRole } from '@/types';
import { getUserById } from '@/services/users/userService'; // To fetch teacher details

// Mock data for classrooms - this will be replaced by database calls
let mockClassroomsData: Classroom[] = [
  { id: "class1", name: "Introduction to Programming", teacherId: "teacher1", teacherName: "Teacher User", studentIds: ["s1", "s2", "s3"], inviteCode: "PROG101" },
  { id: "class2", name: "Advanced Data Structures", teacherId: "teacher1", teacherName: "Teacher User", studentIds: ["s4", "s5"], inviteCode: "DATA202" },
  { id: "class3", name: "Web Development Basics", teacherId: "teacher2", studentIds: ["s1", "s6", "s7", "s8"], inviteCode: "WEBDEV" },
  {
    id: "test-classroom-1",
    name: "Introduction to AI",
    teacherId: "teacher-test-id",
    teacherName: "Test Teacher",
    studentIds: ["student-test-id", "s2"],
    inviteCode: "AI101TEST"
  },
];

/**
 * Creates a new classroom.
 * @param name The name of the classroom.
 * @param description An optional description for the classroom.
 * @param teacherId The ID of the teacher creating the classroom.
 * @returns The newly created classroom object.
 */
export async function createClassroom(name: string, description: string | undefined, teacherId: string): Promise<Classroom> {
  const teacher = await getUserById(teacherId);
  if (!teacher || teacher.role !== UserRole.TEACHER) {
    throw new Error("Invalid teacher ID or user is not a teacher.");
  }

  const newClassroom: Classroom = {
    id: `class-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    name,
    teacherId,
    teacherName: teacher.name, // Populate teacher's name
    studentIds: [],
    inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(), // Generate a random invite code
    // description can be added to the Classroom type if needed
  };
  mockClassroomsData.push(newClassroom);
  return newClassroom;
}

/**
 * Retrieves all classrooms taught by a specific teacher.
 * @param teacherId The ID of the teacher.
 * @returns A list of classrooms.
 */
export async function getClassroomsByTeacherId(teacherId: string): Promise<Classroom[]> {
  return mockClassroomsData.filter(c => c.teacherId === teacherId);
}

/**
 * Retrieves a classroom by its ID.
 * @param classroomId The ID of the classroom.
 * @returns The classroom object if found, otherwise null.
 */
export async function getClassroomById(classroomId: string): Promise<Classroom | null> {
  const classroom = mockClassroomsData.find(c => c.id === classroomId);
  if (classroom && classroom.teacherId && !classroom.teacherName) {
    // Populate teacherName if missing (e.g., for older mock data)
    const teacher = await getUserById(classroom.teacherId);
    if (teacher) classroom.teacherName = teacher.name;
  }
  return classroom || null;
}

/**
 * (Placeholder) Adds a student to a classroom.
 * @param classroomId The ID of the classroom.
 * @param studentId The ID of the student.
 */
export async function addStudentToClassroom(classroomId: string, studentId: string): Promise<Classroom | null> {
  const classroom = mockClassroomsData.find(c => c.id === classroomId);
  if (classroom && !classroom.studentIds.includes(studentId)) {
    const student = await getUserById(studentId);
    if (!student || student.role !== UserRole.STUDENT) {
      throw new Error("Invalid student ID or user is not a student.");
    }
    classroom.studentIds.push(studentId);
    return classroom;
  }
  if (!classroom) throw new Error("Classroom not found.");
  return classroom; // Or throw error if student already in classroom
}

/**
 * (Placeholder) Removes a student from a classroom.
 * @param classroomId The ID of the classroom.
 * @param studentId The ID of the student.
 */
export async function removeStudentFromClassroom(classroomId: string, studentId: string): Promise<Classroom | null> {
   const classroom = mockClassroomsData.find(c => c.id === classroomId);
   if (classroom) {
     classroom.studentIds = classroom.studentIds.filter(id => id !== studentId);
     return classroom;
   }
   if (!classroom) throw new Error("Classroom not found.");
   return null;
}

// Function to get all mock classrooms (for potential admin/testing purposes)
export async function getAllClassrooms(): Promise<Classroom[]> {
  return mockClassroomsData;
}
