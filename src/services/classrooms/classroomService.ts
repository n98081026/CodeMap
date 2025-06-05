
// src/services/classrooms/classroomService.ts
'use server';

/**
 * @fileOverview Classroom service for handling classroom-related operations using Supabase.
 */

import type { Classroom, User } from '@/types';
import { UserRole } from '@/types';
import { supabase } from '@/lib/supabaseClient';
import { getUserById } from '@/services/users/userService'; 


async function populateTeacherName(classroom: Classroom): Promise<void> {
  if (classroom.teacherId && !classroom.teacherName) {
    const teacher = await getUserById(classroom.teacherId);
    if (teacher) {
      classroom.teacherName = teacher.name;
    } else {
      classroom.teacherName = "Unknown Teacher";
    }
  }
}

async function populateStudentDetailsForClassroom(classroom: Classroom): Promise<void> {
  const { data: studentEntries, error: studentEntriesError } = await supabase
    .from('classroom_students')
    .select('student_id')
    .eq('classroom_id', classroom.id);

  if (studentEntriesError) {
    console.error(`Error fetching student entries for classroom ${classroom.id}:`, studentEntriesError);
    classroom.studentIds = [];
    classroom.students = [];
    return;
  }

  const studentIds = studentEntries.map(entry => entry.student_id);
  classroom.studentIds = studentIds;

  if (studentIds.length > 0) {
    const { data: studentProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, email, role')
      .in('id', studentIds);

    if (profilesError) {
      console.error(`Error fetching student profiles for classroom ${classroom.id}:`, profilesError);
      classroom.students = []; 
      return;
    }
    classroom.students = studentProfiles as User[];
  } else {
    classroom.students = [];
  }
}


export async function createClassroom(
  name: string,
  description: string | undefined,
  teacherId: string,
  subject?: string,
  difficulty?: "beginner" | "intermediate" | "advanced",
  enableStudentAiAnalysis?: boolean
): Promise<Classroom> {
  const teacher = await getUserById(teacherId);
  if (!teacher || (teacher.role !== UserRole.TEACHER && teacher.role !== UserRole.ADMIN)) {
    throw new Error("Invalid teacher ID or user is not authorized to create classrooms.");
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
  // Default to true if undefined, or use the provided value
  classroomToInsert.enable_student_ai_analysis = enableStudentAiAnalysis === undefined ? true : enableStudentAiAnalysis;

  const { data, error } = await supabase
    .from('classrooms')
    .insert(classroomToInsert)
    .select()
    .single();

  if (error) {
    console.error('Supabase createClassroom error:', error);
    throw new Error(`Failed to create classroom: ${error.message}`);
  }
  if (!data) throw new Error("Failed to create classroom: No data returned.");

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
        teacherName: (c.teacher as any)?.name || 'Unknown Teacher',
        studentIds: [], 
        inviteCode: c.invite_code,
        subject: c.subject ?? undefined,
        difficulty: c.difficulty ?? undefined,
        enableStudentAiAnalysis: c.enable_student_ai_analysis ?? true,
    };
    // Fetch student count for each classroom
    const { count: studentCount, error: countError } = await supabase
      .from('classroom_students')
      .select('student_id', { count: 'exact', head: true })
      .eq('classroom_id', c.id);

    if (countError) {
        console.warn(`Error counting students for classroom ${c.id}: ${countError.message}`);
        classroom.studentIds = []; // Default to empty array on error
    } else {
        classroom.studentIds = Array(studentCount || 0).fill(''); // Placeholder array of correct length
    }
    return classroom;
  });

  const classrooms = await Promise.all(classroomsPromises);
  return { classrooms, totalCount: count || 0 };
}


export async function getClassroomsByStudentId(studentId: string): Promise<Classroom[]> {
  const { data: studentClassEntries, error: entriesError } = await supabase
    .from('classroom_students')
    .select('classroom_id')
    .eq('student_id', studentId);

  if (entriesError) {
    console.error('Supabase getClassroomsByStudentId (entries) error:', entriesError);
    throw new Error(`Failed to fetch student's classroom entries: ${entriesError.message}`);
  }
  if (!studentClassEntries || studentClassEntries.length === 0) {
    return [];
  }

  const classroomIds = studentClassEntries.map(entry => entry.classroom_id);

  const { data: classroomData, error: classroomsError } = await supabase
    .from('classrooms')
    .select('*, teacher:profiles!teacher_id(name)')
    .in('id', classroomIds)
    .order('name', { ascending: true });

  if (classroomsError) {
    console.error('Supabase getClassroomsByStudentId (classrooms) error:', classroomsError);
    throw new Error(`Failed to fetch classrooms: ${classroomsError.message}`);
  }

  const classroomsPromises = (classroomData || []).map(async (c) => {
    const classroom: Classroom = {
        id: c.id,
        name: c.name,
        description: c.description ?? undefined,
        teacherId: c.teacher_id,
        teacherName: (c.teacher as any)?.name || 'Unknown Teacher',
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
    if (countError) console.warn(`Error counting students for classroom ${c.id}: ${countError.message}`);
    classroom.studentIds = Array(studentCount || 0).fill('');
    return classroom;
  });
  
  return Promise.all(classroomsPromises);
}


export async function getClassroomById(classroomId: string): Promise<Classroom | null> {
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
    teacherName: (data.teacher as any)?.name || 'Unknown Teacher',
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


export async function addStudentToClassroom(classroomId: string, studentId: string): Promise<Classroom | null> {
  const classroomData = await getClassroomById(classroomId); 
  if (!classroomData) throw new Error("Classroom not found.");

  const student = await getUserById(studentId);
  if (!student || student.role !== UserRole.STUDENT) {
    throw new Error("Invalid student ID or user is not a student.");
  }

  const { data: existingEntry, error: checkError } = await supabase
    .from('classroom_students')
    .select('*')
    .eq('classroom_id', classroomId)
    .eq('student_id', studentId)
    .maybeSingle(); 

  if (checkError && checkError.code !== 'PGRST116') { 
      console.error("Error checking existing student enrollment:", checkError);
      throw new Error(`Failed to check enrollment: ${checkError.message}`);
  }

  if (existingEntry) { // Student already enrolled
    await populateStudentDetailsForClassroom(classroomData); // Ensure it's up-to-date
    return classroomData;
  }

  const { error: insertError } = await supabase
    .from('classroom_students')
    .insert({ classroom_id: classroomId, student_id: studentId });

  if (insertError) {
    console.error('Supabase addStudentToClassroom error:', insertError);
    throw new Error(`Failed to add student to classroom: ${insertError.message}`);
  }

  await populateStudentDetailsForClassroom(classroomData); 
  return classroomData;
}


export async function removeStudentFromClassroom(classroomId: string, studentId: string): Promise<Classroom | null> {
  const classroomData = await getClassroomById(classroomId); 
  if (!classroomData) throw new Error("Classroom not found.");

  const { error } = await supabase
    .from('classroom_students')
    .delete()
    .eq('classroom_id', classroomId)
    .eq('student_id', studentId);

  if (error) {
    console.error('Supabase removeStudentFromClassroom error:', error);
    throw new Error(`Failed to remove student from classroom: ${error.message}`);
  }

  await populateStudentDetailsForClassroom(classroomData); 
  return classroomData;
}


export async function updateClassroom(classroomId: string, updates: Partial<Pick<Classroom, 'name' | 'description' | 'subject' | 'difficulty' | 'enableStudentAiAnalysis'>>): Promise<Classroom | null> {
  const classroomToUpdate = await getClassroomById(classroomId);
  if (!classroomToUpdate) return null; 

  const supabaseUpdates: any = {};
  if (updates.name !== undefined) supabaseUpdates.name = updates.name;
  if (updates.description !== undefined) supabaseUpdates.description = updates.description === "" ? null : updates.description;
  if (updates.subject !== undefined) supabaseUpdates.subject = updates.subject === "" ? null : updates.subject;
  if (updates.difficulty !== undefined) supabaseUpdates.difficulty = updates.difficulty;
  if (updates.enableStudentAiAnalysis !== undefined) supabaseUpdates.enable_student_ai_analysis = updates.enableStudentAiAnalysis;
  
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
    teacherName: (data.teacher as any)?.name || classroomToUpdate.teacherName, 
    studentIds: classroomToUpdate.studentIds, 
    students: classroomToUpdate.students, // Students list needs re-population if studentIds changed
    inviteCode: data.invite_code,
    subject: data.subject ?? undefined,
    difficulty: data.difficulty ?? undefined,
    enableStudentAiAnalysis: data.enable_student_ai_analysis ?? true,
  };
  await populateStudentDetailsForClassroom(updatedClassroom); // Re-populate in case student list needs update
  return updatedClassroom;
}


export async function deleteClassroom(classroomId: string): Promise<boolean> {
  const { error: deleteEnrollmentsError } = await supabase
    .from('classroom_students')
    .delete()
    .eq('classroom_id', classroomId);

  if (deleteEnrollmentsError) {
    console.error('Supabase deleteClassroom (enrollments) error:', deleteEnrollmentsError);
    throw new Error(`Failed to delete student enrollments for classroom: ${deleteEnrollmentsError.message}`);
  }

  // TODO: Consider what to do with concept maps shared with this classroom.
  // For now, they will remain but shared_with_classroom_id will point to a non-existent classroom.
  // Could set shared_with_classroom_id to NULL for those maps.

  const { error: deleteClassroomError, count } = await supabase
    .from('classrooms')
    .delete({count: 'exact'})
    .eq('id', classroomId);

  if (deleteClassroomError) {
    console.error('Supabase deleteClassroom error:', deleteClassroomError);
    throw new Error(`Failed to delete classroom: ${deleteClassroomError.message}`);
  }
  
  return count !== null && count > 0;
}


export async function getAllClassrooms(): Promise<Classroom[]> {
  const { data: classroomRows, error: classroomError } = await supabase
    .from('classrooms')
    .select('*, teacher:profiles!teacher_id(name)') 
    .order('name', { ascending: true });

  if (classroomError) {
    console.error('Supabase getAllClassrooms (fetch classrooms) error:', classroomError);
    throw new Error(`Failed to fetch all classrooms: ${classroomError.message}`);
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
      teacherName: (row.teacher as any)?.name || 'Unknown Teacher',
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

    if (countError) console.warn(`Error counting students for classroom ${classroom.id}: ${countError.message}`);
    classroom.studentIds = Array(studentCount || 0).fill(''); 

    return classroom;
  });

  return Promise.all(classroomsPromises);
}
