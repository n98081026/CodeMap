
// src/services/classrooms/classroomService.ts
'use server';

/**
 * @fileOverview Classroom service for handling classroom-related operations.
 */

import type { Classroom, User } from '@/types';
import { UserRole } from '@/types';
import { getUserById } from '@/services/users/userService'; // To fetch teacher/student details

// Mock data for classrooms - this will be replaced by database calls
let mockClassroomsData: Classroom[] = [
  { id: "class1", name: "Introduction to Programming", teacherId: "teacher1", teacherName: "Teacher User", studentIds: ["student1", "s2", "s3", "student-test-id"], inviteCode: "PROG101", students: [], description: "Learn the fundamentals of programming using Python." },
  { id: "class2", name: "Advanced Data Structures", teacherId: "teacher1", teacherName: "Teacher User", studentIds: ["s4", "s5"], inviteCode: "DATA202", students: [], description: "Deep dive into complex data structures and algorithms." },
  { id: "class3", name: "Web Development Basics", teacherId: "teacher2", studentIds: ["student1", "s6", "s7", "s8"], inviteCode: "WEBDEV", students: [], description: "Covers HTML, CSS, and basic JavaScript." },
  {
    id: "test-classroom-1",
    name: "Introduction to AI",
    teacherId: "teacher-test-id",
    teacherName: "Test Teacher",
    studentIds: ["student-test-id", "s2"],
    inviteCode: "AI101TEST",
    students: [],
    description: "An introductory course to Artificial Intelligence concepts."
  },
];

// Helper to populate student details - in real app, this would be an efficient DB query
async function populateStudentDetails(studentIds: string[]): Promise<User[]> {
  const students: User[] = [];
  for (const id of studentIds) {
    const student = await getUserById(id);
    if (student) {
      students.push(student);
    }
  }
  return students;
}

async function populateTeacherName(classroom: Classroom): Promise<void> {
  if (classroom.teacherId && !classroom.teacherName) {
    const teacher = await getUserById(classroom.teacherId);
    if (teacher) classroom.teacherName = teacher.name;
  }
}


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
    description: description || undefined,
    teacherId,
    teacherName: teacher.name,
    studentIds: [],
    students: [],
    inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
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
  const classrooms = mockClassroomsData.filter(c => c.teacherId === teacherId);
  for (const classroom of classrooms) {
     await populateTeacherName(classroom);
  }
  return classrooms;
}

/**
 * Retrieves all classrooms a specific student is enrolled in.
 * @param studentId The ID of the student.
 * @returns A list of classrooms.
 */
export async function getClassroomsByStudentId(studentId: string): Promise<Classroom[]> {
  const classrooms = mockClassroomsData.filter(c => c.studentIds.includes(studentId));
  for (const classroom of classrooms) {
    await populateTeacherName(classroom);
  }
  return classrooms;
}


/**
 * Retrieves a classroom by its ID, populating student details.
 * @param classroomId The ID of the classroom.
 * @returns The classroom object if found, otherwise null.
 */
export async function getClassroomById(classroomId: string): Promise<Classroom | null> {
  const classroom = mockClassroomsData.find(c => c.id === classroomId);
  if (!classroom) return null;

  await populateTeacherName(classroom);
  classroom.students = await populateStudentDetails(classroom.studentIds);
  return classroom;
}

/**
 * Adds a student (by ID) to a classroom.
 * @param classroomId The ID of the classroom.
 * @param studentId The ID of the student.
 * @returns The updated classroom object or null if not found/student invalid.
 */
export async function addStudentToClassroom(classroomId: string, studentId: string): Promise<Classroom | null> {
  const classroomIndex = mockClassroomsData.findIndex(c => c.id === classroomId);
  if (classroomIndex === -1) {
    throw new Error("Classroom not found.");
  }

  const student = await getUserById(studentId);
  if (!student || student.role !== UserRole.STUDENT) {
    throw new Error("Invalid student ID or user is not a student.");
  }

  const classroom = mockClassroomsData[classroomIndex];
  if (!classroom.studentIds.includes(studentId)) {
    classroom.studentIds.push(studentId);
    classroom.students = await populateStudentDetails(classroom.studentIds);
    mockClassroomsData[classroomIndex] = classroom; 
    return classroom;
  }
  // If student already in classroom, just ensure details are fresh
  classroom.students = await populateStudentDetails(classroom.studentIds);
  return classroom;
}

/**
 * Removes a student from a classroom.
 * @param classroomId The ID of the classroom.
 * @param studentId The ID of the student.
 * @returns The updated classroom object or null if classroom not found.
 */
export async function removeStudentFromClassroom(classroomId: string, studentId: string): Promise<Classroom | null> {
   const classroomIndex = mockClassroomsData.findIndex(c => c.id === classroomId);
   if (classroomIndex === -1) {
     throw new Error("Classroom not found.");
   }
   
   const classroom = mockClassroomsData[classroomIndex];
   const initialStudentCount = classroom.studentIds.length;
   classroom.studentIds = classroom.studentIds.filter(id => id !== studentId);

   if (classroom.studentIds.length < initialStudentCount) { 
     classroom.students = await populateStudentDetails(classroom.studentIds);
     mockClassroomsData[classroomIndex] = classroom; 
   } else { 
     classroom.students = await populateStudentDetails(classroom.studentIds);
   }
   return classroom;
}

/**
 * Updates a classroom.
 * @param classroomId The ID of the classroom.
 * @param updates Partial classroom data to update (name, description).
 * @returns The updated classroom or null if not found.
 */
export async function updateClassroom(classroomId: string, updates: { name?: string; description?: string }): Promise<Classroom | null> {
  const classroomIndex = mockClassroomsData.findIndex(c => c.id === classroomId);
  if (classroomIndex === -1) return null;

  const classroomToUpdate = { ...mockClassroomsData[classroomIndex] };
  if (updates.name !== undefined) {
    classroomToUpdate.name = updates.name;
  }
  if (updates.description !== undefined) {
    classroomToUpdate.description = updates.description;
  }
  
  mockClassroomsData[classroomIndex] = classroomToUpdate;
  await populateTeacherName(mockClassroomsData[classroomIndex]);
  mockClassroomsData[classroomIndex].students = await populateStudentDetails(mockClassroomsData[classroomIndex].studentIds);

  return mockClassroomsData[classroomIndex];
}

/**
 * Deletes a classroom.
 * @param classroomId The ID of the classroom to delete.
 * @returns True if deleted, false otherwise.
 */
export async function deleteClassroom(classroomId: string): Promise<boolean> {
  const initialLength = mockClassroomsData.length;
  mockClassroomsData = mockClassroomsData.filter(c => c.id !== classroomId);
  return mockClassroomsData.length < initialLength;
}

export async function getAllClassrooms(): Promise<Classroom[]> {
  const classrooms = [...mockClassroomsData]; // Return a copy
  for (const classroom of classrooms) {
     await populateTeacherName(classroom);
     // Optionally populate student details if needed by admin view, but can be heavy
     // classroom.students = await populateStudentDetails(classroom.studentIds);
  }
  return classrooms;
}

    