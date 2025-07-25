// src/services/classrooms/classroomService.ts
'use server';

/**
 * @fileOverview Classroom service for handling classroom-related operations using Supabase.
 */

import type { Classroom, User } from '@/types';

import {
  BYPASS_AUTH_FOR_TESTING,
  MOCK_CLASSROOM_STUDENTS_STORE,
  MOCK_CLASSROOMS_STORE,
  MOCK_STUDENT_USER,
  MOCK_TEACHER_USER,
  MOCK_USERS,
} from '@/lib/config';
import { supabase } from '@/lib/supabaseClient';
import { getUserById } from '@/services/users/userService';
import { UserRole } from '@/types';

// Mock data store for bypass mode
let MOCK_CLASSROOMS_STORE_LOCAL: Classroom[] = [...MOCK_CLASSROOMS_STORE];
let MOCK_CLASSROOM_STUDENTS_STORE_LOCAL: Array<{
  classroom_id: string;
  student_id: string;
}> = [...MOCK_CLASSROOM_STUDENTS_STORE];

async function populateStudentDetailsForClassroom(
  classroom: Classroom
): Promise<void> {
  if (BYPASS_AUTH_FOR_TESTING) {
    const studentEntries = MOCK_CLASSROOM_STUDENTS_STORE_LOCAL.filter(
      (cs) => cs.classroom_id === classroom.id
    );
    classroom.studentIds = studentEntries.map((entry) => entry.student_id);
    classroom.students = classroom.studentIds
      .map((id) => MOCK_USERS.find((u) => u.id === id))
      .filter((u): u is User => u !== undefined);
    return;
  }

  const { data: studentEntries, error: studentEntriesError } = await supabase
    .from('classroom_students')
    .select('student_id')
    .eq('classroom_id', classroom.id);

  if (studentEntriesError) {
    console.error(
      `Error fetching student entries for classroom ${classroom.id}:`,
      studentEntriesError
    );
    classroom.studentIds = [];
    classroom.students = [];
    return;
  }

  const studentIds = studentEntries.map((entry) => entry.student_id);
  classroom.studentIds = studentIds;

  if (studentIds.length > 0) {
    const { data: studentProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, email, role')
      .in('id', studentIds);

    if (profilesError) {
      console.error(
        `Error fetching student profiles for classroom ${classroom.id}:`,
        profilesError
      );
      classroom.students = [];
      return;
    }
    classroom.students = (studentProfiles as User[]) ?? [];
  } else {
    classroom.students = [];
  }
}

export async function createClassroom(
  name: string,
  description: string | undefined,
  teacherId: string,
  subject?: string,
  difficulty?: 'beginner' | 'intermediate' | 'advanced',
  enableStudentAiAnalysis?: boolean
): Promise<Classroom> {
  if (BYPASS_AUTH_FOR_TESTING) {
    const teacher = MOCK_USERS.find((u) => u.id === teacherId);
    if (
      !teacher ||
      (teacher.role !== UserRole.TEACHER && teacher.role !== UserRole.ADMIN)
    ) {
      throw new Error(
        'BYPASS_AUTH: Invalid teacher ID or user is not authorized.'
      );
    }
    const newClassroom: Classroom = {
      id: `class-bypass-${Date.now()}`,
      name,
      description,
      teacherId,
      teacherName: teacher.name,
      studentIds: [],
      students: [],
      inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
      subject,
      difficulty,
      enableStudentAiAnalysis:
        enableStudentAiAnalysis === undefined ? true : enableStudentAiAnalysis,
    };
    MOCK_CLASSROOMS_STORE_LOCAL.push(newClassroom);
    return newClassroom;
  }

  const teacher = await getUserById(teacherId);
  if (
    !teacher ||
    (teacher.role !== UserRole.TEACHER && teacher.role !== UserRole.ADMIN)
  ) {
    throw new Error(
      'Invalid teacher ID or user is not authorized to create classrooms.'
    );
  }

  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  const classroomToInsert: any = {
    name,
    description: description || null,
    teacher_id: teacherId,
    invite_code: inviteCode,
  };

  if (subject) classroomToInsert.subject = subject;
  if (difficulty) classroomToInsert.difficulty = difficulty;
  classroomToInsert.enable_student_ai_analysis =
    enableStudentAiAnalysis === undefined ? true : enableStudentAiAnalysis;

  const { data, error } = await supabase
    .from('classrooms')
    .insert(classroomToInsert)
    .select()
    .single();

  if (error) {
    console.error('Supabase createClassroom error:', error);
    throw new Error(`Failed to create classroom: ${error.message}`);
  }
  if (!data) throw new Error('Failed to create classroom: No data returned.');

  return {
    id: data.id,
    name: data.name,
    description: data.description ?? undefined,
    teacherId: data.teacher_id,
    teacherName: teacher.name,
    studentIds: [],
    students: [],
    inviteCode: data.invite_code,
    subject: data.subject ?? undefined,
    difficulty: data.difficulty ?? undefined,
    enableStudentAiAnalysis: data.enable_student_ai_analysis ?? true,
  };
}

export async function getClassroomsByTeacherId(
  teacherId: string,
  page?: number,
  limit?: number,
  searchTerm?: string
): Promise<{ classrooms: Classroom[]; totalCount: number }> {
  if (BYPASS_AUTH_FOR_TESTING && teacherId === MOCK_TEACHER_USER.id) {
    let filtered = MOCK_CLASSROOMS_STORE_LOCAL.filter(
      (c) => c.teacherId === teacherId
    );
    if (searchTerm) {
      filtered = filtered.filter((c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    const totalCount = filtered.length;
    if (page && limit) {
      filtered = filtered.slice((page - 1) * limit, page * limit);
    }
    return {
      classrooms: filtered.map((c) => ({
        ...c,
        studentIds: MOCK_CLASSROOM_STUDENTS_STORE_LOCAL.filter(
          (cs) => cs.classroom_id === c.id
        ).map((cs) => cs.student_id),
      })),
      totalCount,
    };
  }
  if (BYPASS_AUTH_FOR_TESTING) return { classrooms: [], totalCount: 0 };

  let query = supabase
    .from('classrooms')
    .select('*, teacher:profiles!teacher_id(name)', { count: 'exact' })
    .eq('teacher_id', teacherId)
    .order('name', { ascending: true });

  if (searchTerm && searchTerm.trim() !== '') {
    const cleanedSearchTerm = searchTerm.trim().replace(/[%_]/g, '\\$&');
    query = query.ilike('name', `%${cleanedSearchTerm}%`);
  }

  if (page && limit) {
    const startIndex = (page - 1) * limit;
    query = query.range(startIndex, startIndex + limit - 1);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Supabase getClassroomsByTeacherId error:', error);
    throw new Error(`Failed to fetch classrooms for teacher: ${error.message}`);
  }

  const classroomsPromises = (data || []).map(async (c) => {
    const classroom: Classroom = {
      id: c.id,
      name: c.name,
      description: c.description ?? undefined,
      teacherId: c.teacher_id,
      teacherName:
        (c.teacher as { name: string } | null)?.name ?? 'Unknown Teacher',
      studentIds: [],
      inviteCode: c.invite_code,
      subject: c.subject ?? undefined,
      difficulty: c.difficulty ?? undefined,
      enableStudentAiAnalysis: c.enable_student_ai_analysis ?? true,
    };
    const { count: studentCount, error: countError } = await supabase
      .from('classroom_students')
      .select('student_id', { count: 'exact', head: true })
      .eq('classroom_id', c.id);

    if (countError) {
      console.warn(
        `Error counting students for classroom ${c.id}: ${countError.message}`
      );
      classroom.studentIds = [];
    } else {
      classroom.studentIds = Array(studentCount || 0).fill('');
    }
    return classroom;
  });

  const classrooms = await Promise.all(classroomsPromises);
  return { classrooms, totalCount: count || 0 };
}

export async function getClassroomsByStudentId(
  studentId: string
): Promise<Classroom[]> {
  if (BYPASS_AUTH_FOR_TESTING && studentId === MOCK_STUDENT_USER.id) {
    const enrolledClassroomIds = MOCK_CLASSROOM_STUDENTS_STORE_LOCAL.filter(
      (cs) => cs.student_id === studentId
    ).map((cs) => cs.classroom_id);
    return MOCK_CLASSROOMS_STORE_LOCAL.filter((c) =>
      enrolledClassroomIds.includes(c.id)
    ).map((c) => ({
      ...c,
      studentIds: MOCK_CLASSROOM_STUDENTS_STORE_LOCAL.filter(
        (cs) => cs.classroom_id === c.id
      ).map((cs) => cs.student_id),
    }));
  }
  if (BYPASS_AUTH_FOR_TESTING) return [];

  const { data: studentClassEntries, error: entriesError } = await supabase
    .from('classroom_students')
    .select('classroom_id')
    .eq('student_id', studentId);

  if (entriesError) {
    console.error(
      'Supabase getClassroomsByStudentId (entries) error:',
      entriesError
    );
    throw new Error(
      `Failed to fetch student's classroom entries: ${entriesError.message}`
    );
  }
  if (!studentClassEntries || studentClassEntries.length === 0) {
    return [];
  }

  const classroomIds = studentClassEntries.map((entry) => entry.classroom_id);

  const { data: classroomData, error: classroomsError } = await supabase
    .from('classrooms')
    .select('*, teacher:profiles!teacher_id(name)')
    .in('id', classroomIds)
    .order('name', { ascending: true });

  if (classroomsError) {
    console.error(
      'Supabase getClassroomsByStudentId (classrooms) error:',
      classroomsError
    );
    throw new Error(`Failed to fetch classrooms: ${classroomsError.message}`);
  }

  const classroomsPromises = (classroomData || []).map(async (c) => {
    const classroom: Classroom = {
      id: c.id,
      name: c.name,
      description: c.description ?? undefined,
      teacherId: c.teacher_id,
      teacherName:
        (c.teacher as { name: string } | null)?.name ?? 'Unknown Teacher',
      studentIds: [],
      inviteCode: c.invite_code,
      subject: c.subject ?? undefined,
      difficulty: c.difficulty ?? undefined,
      enableStudentAiAnalysis: c.enable_student_ai_analysis ?? true,
    };
    const { count: studentCount, error: countError } = await supabase
      .from('classroom_students')
      .select('student_id', { count: 'exact', head: true })
      .eq('classroom_id', c.id);
    if (countError)
      console.warn(
        `Error counting students for classroom ${c.id}: ${countError.message}`
      );
    classroom.studentIds = Array(studentCount || 0).fill('');
    return classroom;
  });

  return Promise.all(classroomsPromises);
}

export async function getClassroomById(
  classroomId: string
): Promise<Classroom | null> {
  if (BYPASS_AUTH_FOR_TESTING) {
    const classroom = MOCK_CLASSROOMS_STORE_LOCAL.find(
      (c) => c.id === classroomId
    );
    if (!classroom) return null;
    const clonedClassroom = { ...classroom }; // Avoid mutating mock store directly
    await populateStudentDetailsForClassroom(clonedClassroom); // Populate mock students
    return clonedClassroom;
  }

  const { data, error } = await supabase
    .from('classrooms')
    .select('*, teacher:profiles!teacher_id(name)')
    .eq('id', classroomId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Supabase getClassroomById error:', error);
    throw new Error(`Failed to fetch classroom: ${error.message}`);
  }
  if (!data) return null;

  const classroom: Classroom = {
    id: data.id,
    name: data.name,
    description: data.description ?? undefined,
    teacherId: data.teacher_id,
    teacherName:
      (data.teacher as { name: string } | null)?.name ?? 'Unknown Teacher',
    studentIds: [],
    students: [],
    inviteCode: data.invite_code,
    subject: data.subject ?? undefined,
    difficulty: data.difficulty ?? undefined,
    enableStudentAiAnalysis: data.enable_student_ai_analysis ?? true,
  };

  await populateStudentDetailsForClassroom(classroom);
  return classroom;
}

export async function addStudentToClassroom(
  classroomId: string,
  studentId: string
): Promise<Classroom | null> {
  if (BYPASS_AUTH_FOR_TESTING) {
    const classroom = MOCK_CLASSROOMS_STORE_LOCAL.find(
      (c) => c.id === classroomId
    );
    const student = MOCK_USERS.find(
      (u) => u.id === studentId && u.role === UserRole.STUDENT
    );
    if (!classroom) throw new Error('BYPASS_AUTH: Classroom not found.');
    if (!student)
      throw new Error(
        'BYPASS_AUTH: Invalid student ID or user is not a student.'
      );
    if (
      !MOCK_CLASSROOM_STUDENTS_STORE_LOCAL.find(
        (cs) => cs.classroom_id === classroomId && cs.student_id === studentId
      )
    ) {
      MOCK_CLASSROOM_STUDENTS_STORE_LOCAL.push({
        classroom_id: classroomId,
        student_id: studentId,
      });
    }
    const clonedClassroom = { ...classroom };
    await populateStudentDetailsForClassroom(clonedClassroom);
    return clonedClassroom;
  }

  const classroomData = await getClassroomById(classroomId);
  if (!classroomData) throw new Error('Classroom not found.');

  const student = await getUserById(studentId);
  if (!student || student.role !== UserRole.STUDENT) {
    throw new Error('Invalid student ID or user is not a student.');
  }

  const { data: existingEntry, error: checkError } = await supabase
    .from('classroom_students')
    .select('*')
    .eq('classroom_id', classroomId)
    .eq('student_id', studentId)
    .maybeSingle();

  if (checkError && checkError.code !== 'PGRST116') {
    console.error('Error checking existing student enrollment:', checkError);
    throw new Error(`Failed to check enrollment: ${checkError.message}`);
  }

  if (existingEntry) {
    await populateStudentDetailsForClassroom(classroomData);
    return classroomData;
  }

  const { error: insertError } = await supabase
    .from('classroom_students')
    .insert({ classroom_id: classroomId, student_id: studentId });

  if (insertError) {
    console.error('Supabase addStudentToClassroom error:', insertError);
    throw new Error(
      `Failed to add student to classroom: ${insertError.message}`
    );
  }

  await populateStudentDetailsForClassroom(classroomData);
  return classroomData;
}

export async function removeStudentFromClassroom(
  classroomId: string,
  studentId: string
): Promise<Classroom | null> {
  if (BYPASS_AUTH_FOR_TESTING) {
    const classroom = MOCK_CLASSROOMS_STORE_LOCAL.find(
      (c) => c.id === classroomId
    );
    if (!classroom) throw new Error('BYPASS_AUTH: Classroom not found.');
    MOCK_CLASSROOM_STUDENTS_STORE_LOCAL =
      MOCK_CLASSROOM_STUDENTS_STORE_LOCAL.filter(
        (cs) =>
          !(cs.classroom_id === classroomId && cs.student_id === studentId)
      );
    const clonedClassroom = { ...classroom };
    await populateStudentDetailsForClassroom(clonedClassroom);
    return clonedClassroom;
  }

  const classroomData = await getClassroomById(classroomId);
  if (!classroomData) throw new Error('Classroom not found.');

  const { error } = await supabase
    .from('classroom_students')
    .delete()
    .eq('classroom_id', classroomId)
    .eq('student_id', studentId);

  if (error) {
    console.error('Supabase removeStudentFromClassroom error:', error);
    throw new Error(
      `Failed to remove student from classroom: ${error.message}`
    );
  }

  await populateStudentDetailsForClassroom(classroomData);
  return classroomData;
}

export async function updateClassroom(
  classroomId: string,
  updates: Partial<
    Pick<
      Classroom,
      | 'name'
      | 'description'
      | 'subject'
      | 'difficulty'
      | 'enableStudentAiAnalysis'
    >
  >
): Promise<Classroom | null> {
  if (BYPASS_AUTH_FOR_TESTING) {
    const index = MOCK_CLASSROOMS_STORE_LOCAL.findIndex(
      (c) => c.id === classroomId
    );
    if (index === -1) return null;
    MOCK_CLASSROOMS_STORE_LOCAL[index] = {
      ...MOCK_CLASSROOMS_STORE_LOCAL[index],
      ...updates,
    };
    const clonedClassroom = { ...MOCK_CLASSROOMS_STORE_LOCAL[index] };
    await populateStudentDetailsForClassroom(clonedClassroom);
    return clonedClassroom;
  }

  const classroomToUpdate = await getClassroomById(classroomId);
  if (!classroomToUpdate) return null;

  const supabaseUpdates: any = {};
  if (updates.name !== undefined) supabaseUpdates.name = updates.name;
  if (updates.description !== undefined)
    supabaseUpdates.description =
      updates.description === '' ? null : updates.description;
  if (updates.subject !== undefined)
    supabaseUpdates.subject = updates.subject === '' ? null : updates.subject;
  if (updates.difficulty !== undefined)
    supabaseUpdates.difficulty = updates.difficulty;
  if (updates.enableStudentAiAnalysis !== undefined)
    supabaseUpdates.enable_student_ai_analysis =
      updates.enableStudentAiAnalysis;

  if (Object.keys(supabaseUpdates).length === 0) {
    return classroomToUpdate;
  }
  supabaseUpdates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('classrooms')
    .update(supabaseUpdates)
    .eq('id', classroomId)
    .select('*, teacher:profiles!teacher_id(name)')
    .single();

  if (error) {
    console.error('Supabase updateClassroom error:', error);
    throw new Error(`Failed to update classroom: ${error.message}`);
  }
  if (!data) return null;

  const updatedClassroom: Classroom = {
    id: data.id,
    name: data.name,
    description: data.description ?? undefined,
    teacherId: data.teacher_id,
    teacherName:
      (data.teacher as { name: string } | null)?.name ??
      classroomToUpdate.teacherName,
    studentIds: classroomToUpdate.studentIds,
    students: classroomToUpdate.students,
    inviteCode: data.invite_code,
    subject: data.subject ?? undefined,
    difficulty: data.difficulty ?? undefined,
    enableStudentAiAnalysis: data.enable_student_ai_analysis ?? true,
  };
  await populateStudentDetailsForClassroom(updatedClassroom);
  return updatedClassroom;
}

export async function deleteClassroom(classroomId: string): Promise<boolean> {
  if (BYPASS_AUTH_FOR_TESTING) {
    const initialLength = MOCK_CLASSROOMS_STORE_LOCAL.length;
    MOCK_CLASSROOMS_STORE_LOCAL = MOCK_CLASSROOMS_STORE_LOCAL.filter(
      (c) => c.id !== classroomId
    );
    MOCK_CLASSROOM_STUDENTS_STORE_LOCAL =
      MOCK_CLASSROOM_STUDENTS_STORE_LOCAL.filter(
        (cs) => cs.classroom_id !== classroomId
      );
    return MOCK_CLASSROOMS_STORE_LOCAL.length < initialLength;
  }

  const { error: deleteEnrollmentsError } = await supabase
    .from('classroom_students')
    .delete()
    .eq('classroom_id', classroomId);

  if (deleteEnrollmentsError) {
    console.error(
      'Supabase deleteClassroom (enrollments) error:',
      deleteEnrollmentsError
    );
    throw new Error(
      `Failed to delete student enrollments for classroom: ${deleteEnrollmentsError.message}`
    );
  }

  const { error: deleteClassroomError, count } = await supabase
    .from('classrooms')
    .delete({ count: 'exact' })
    .eq('id', classroomId);

  if (deleteClassroomError) {
    console.error('Supabase deleteClassroom error:', deleteClassroomError);
    throw new Error(
      `Failed to delete classroom: ${deleteClassroomError.message}`
    );
  }

  return count !== null && count > 0;
}

export async function getAllClassrooms(): Promise<Classroom[]> {
  if (BYPASS_AUTH_FOR_TESTING) {
    return MOCK_CLASSROOMS_STORE_LOCAL.map((c) => ({
      ...c,
      studentIds: MOCK_CLASSROOM_STUDENTS_STORE_LOCAL.filter(
        (cs) => cs.classroom_id === c.id
      ).map((cs) => cs.student_id),
    }));
  }

  const { data: classroomRows, error: classroomError } = await supabase
    .from('classrooms')
    .select('*, teacher:profiles!teacher_id(name)')
    .order('name', { ascending: true });

  if (classroomError) {
    console.error(
      'Supabase getAllClassrooms (fetch classrooms) error:',
      classroomError
    );
    throw new Error(
      `Failed to fetch all classrooms: ${classroomError.message}`
    );
  }

  if (!classroomRows) {
    return [];
  }

  const classroomsPromises = classroomRows.map(async (row) => {
    const classroom: Classroom = {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      teacherId: row.teacher_id,
      teacherName:
        (row.teacher as { name: string } | null)?.name ?? 'Unknown Teacher',
      studentIds: [],
      inviteCode: row.invite_code,
      subject: row.subject ?? undefined,
      difficulty: row.difficulty ?? undefined,
      enableStudentAiAnalysis: row.enable_student_ai_analysis ?? true,
    };

    const { count: studentCount, error: countError } = await supabase
      .from('classroom_students')
      .select('student_id', { count: 'exact', head: true })
      .eq('classroom_id', classroom.id);

    if (countError)
      console.warn(
        `Error counting students for classroom ${classroom.id}: ${countError.message}`
      );
    classroom.studentIds = Array(studentCount || 0).fill('');

    return classroom;
  });

  return Promise.all(classroomsPromises);
}
