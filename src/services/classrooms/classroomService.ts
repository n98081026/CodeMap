
// src/services/classrooms/classroomService.ts
'use server';

/**
 * @fileOverview Classroom service for handling classroom-related operations using Supabase.
 */

import type { Classroom, User } from '@/types';
import { UserRole } from '@/types';
import { supabase } from '@/lib/supabaseClient';
import { getUserById } from '@/services/users/userService'; // Still useful for validating teacher/student roles


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
      classroom.students = []; // Or handle partial data if preferred
      return;
    }
    classroom.students = studentProfiles as User[];
  } else {
    classroom.students = [];
  }
}


export async function createClassroom(name: string, description: string | undefined, teacherId: string): Promise<Classroom> {
  const teacher = await getUserById(teacherId);
  if (!teacher || (teacher.role !== UserRole.TEACHER && teacher.role !== UserRole.ADMIN)) {
    throw new Error("Invalid teacher ID or user is not authorized to create classrooms.");
  }

  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('classrooms')
    .insert({
      name,
      description: description || null,
      teacher_id: teacherId,
      invite_code: inviteCode,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) {
    console.error('Supabase createClassroom error:', error);
    throw new Error(`Failed to create classroom: ${error.message}`);
  }
  if (!data) throw new Error("Failed to create classroom: No data returned.");

  // Convert Supabase row to Classroom type
  return {
    id: data.id,
    name: data.name,
    description: data.description ?? undefined,
    teacherId: data.teacher_id,
    teacherName: teacher.name, // Set from validated teacher
    studentIds: [], // New classroom has no students
    students: [],
    inviteCode: data.invite_code,
    // created_at: data.created_at, // available on data
    // updated_at: data.updated_at, // available on data
  };
}


export async function getClassroomsByTeacherId(
  teacherId: string,
  page?: number,
  limit?: number
): Promise<Classroom[] | { classrooms: Classroom[]; totalCount: number }> {
  let query = supabase
    .from('classrooms')
    .select('*, teacher:profiles!teacher_id(name)', { count: 'exact' }) 
    .eq('teacher_id', teacherId)
    .order('name', { ascending: true });

  if (page && limit) {
    const startIndex = (page - 1) * limit;
    query = query.range(startIndex, startIndex + limit - 1);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Supabase getClassroomsByTeacherId error:', error);
    throw new Error(`Failed to fetch classrooms for teacher: ${error.message}`);
  }

  const classrooms = (data || []).map(c => ({
    id: c.id,
    name: c.name,
    description: c.description ?? undefined,
    teacherId: c.teacher_id,
    teacherName: (c.teacher as any)?.name || 'Unknown Teacher',
    studentIds: [], 
    inviteCode: c.invite_code,
  }));

  for (const classroom of classrooms) {
    const { count: studentCount, error: countError } = await supabase
      .from('classroom_students')
      .select('student_id', { count: 'exact', head: true })
      .eq('classroom_id', classroom.id);
    if (countError) console.warn(`Error counting students for classroom ${classroom.id}: ${countError.message}`);
    classroom.studentIds = Array(studentCount || 0).fill(''); 
  }


  if (page && limit) {
    return { classrooms, totalCount: count || 0 };
  }
  return classrooms;
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

  const classrooms = (classroomData || []).map(c => ({
    id: c.id,
    name: c.name,
    description: c.description ?? undefined,
    teacherId: c.teacher_id,
    teacherName: (c.teacher as any)?.name || 'Unknown Teacher',
    studentIds: [], 
    inviteCode: c.invite_code,
  }));
  
  for (const classroom of classrooms) {
    const { count: studentCount, error: countError } = await supabase
      .from('classroom_students')
      .select('student_id', { count: 'exact', head: true })
      .eq('classroom_id', classroom.id);
    if (countError) console.warn(`Error counting students for classroom ${classroom.id}: ${countError.message}`);
    classroom.studentIds = Array(studentCount || 0).fill(''); 
  }

  return classrooms;
}


export async function getClassroomById(classroomId: string): Promise<Classroom | null> {
  const { data, error } = await supabase
    .from('classrooms')
    .select('*, teacher:profiles!teacher_id(name)') 
    .eq('id', classroomId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; 
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
  };

  await populateStudentDetailsForClassroom(classroom);
  return classroom;
}


export async function addStudentToClassroom(classroomId: string, studentId: string): Promise<Classroom | null> {
  const classroom = await getClassroomById(classroomId); 
  if (!classroom) throw new Error("Classroom not found.");

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

  if (existingEntry) {
    await populateStudentDetailsForClassroom(classroom);
    return classroom;
  }

  const { error: insertError } = await supabase
    .from('classroom_students')
    .insert({ classroom_id: classroomId, student_id: studentId, enrolled_at: new Date().toISOString() });

  if (insertError) {
    console.error('Supabase addStudentToClassroom error:', insertError);
    throw new Error(`Failed to add student to classroom: ${insertError.message}`);
  }

  await populateStudentDetailsForClassroom(classroom); 
  return classroom;
}


export async function removeStudentFromClassroom(classroomId: string, studentId: string): Promise<Classroom | null> {
  const classroom = await getClassroomById(classroomId); 
  if (!classroom) throw new Error("Classroom not found.");

  const { error } = await supabase
    .from('classroom_students')
    .delete()
    .eq('classroom_id', classroomId)
    .eq('student_id', studentId);

  if (error) {
    console.error('Supabase removeStudentFromClassroom error:', error);
    throw new Error(`Failed to remove student from classroom: ${error.message}`);
  }

  await populateStudentDetailsForClassroom(classroom); 
  return classroom;
}


export async function updateClassroom(classroomId: string, updates: { name?: string; description?: string }): Promise<Classroom | null> {
  const classroomToUpdate = await getClassroomById(classroomId);
  if (!classroomToUpdate) return null; 

  const supabaseUpdates: any = {};
  if (updates.name !== undefined) supabaseUpdates.name = updates.name;
  if (updates.description !== undefined) supabaseUpdates.description = updates.description;
  
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
    students: classroomToUpdate.students,
    inviteCode: data.invite_code,
  };
  await populateStudentDetailsForClassroom(updatedClassroom);

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

  const { error: deleteClassroomError } = await supabase
    .from('classrooms')
    .delete()
    .eq('id', classroomId);

  if (deleteClassroomError) {
    console.error('Supabase deleteClassroom error:', deleteClassroomError);
    throw new Error(`Failed to delete classroom: ${deleteClassroomError.message}`);
  }

  return true;
}


export async function getAllClassrooms(): Promise<Classroom[]> {
  const { data: classroomRows, error: classroomError } = await supabase
    .from('classrooms')
    .select('*') // Fetch basic classroom data first
    .order('name', { ascending: true });

  if (classroomError) {
    console.error('Supabase getAllClassrooms (fetch classrooms) error:', classroomError);
    throw new Error(`Failed to fetch all classrooms: ${classroomError.message}`);
  }

  if (!classroomRows) {
    return [];
  }

  const classrooms: Classroom[] = [];

  for (const row of classroomRows) {
    let teacherName = 'Unknown Teacher';
    if (row.teacher_id) {
      // Fetch teacher profile separately
      const { data: teacherProfile, error: teacherError } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', row.teacher_id)
        .single();

      if (teacherError && teacherError.code !== 'PGRST116') { 
        console.warn(`Error fetching teacher profile for ID ${row.teacher_id}:`, teacherError.message);
      } else if (teacherProfile) {
        teacherName = teacherProfile.name;
      }
    }
    
    const classroom: Classroom = {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      teacherId: row.teacher_id,
      teacherName: teacherName,
      studentIds: [], 
      inviteCode: row.invite_code,
    };

    const { count: studentCount, error: countError } = await supabase
      .from('classroom_students')
      .select('student_id', { count: 'exact', head: true })
      .eq('classroom_id', classroom.id);

    if (countError) console.warn(`Error counting students for classroom ${classroom.id}: ${countError.message}`);
    classroom.studentIds = Array(studentCount || 0).fill(''); 

    classrooms.push(classroom);
  }

  return classrooms;
}

