
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
    .select('*, teacher:profiles!teacher_id(name)', { count: 'exact' }) // Assuming RLS allows fetching teacher name
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
    studentIds: [], // Needs separate query or join for student count if displayed on list
    inviteCode: c.invite_code,
  }));

  // Populate student counts for each classroom (can be heavy, consider if needed for list view)
  for (const classroom of classrooms) {
    const { count: studentCount, error: countError } = await supabase
      .from('classroom_students')
      .select('student_id', { count: 'exact', head: true })
      .eq('classroom_id', classroom.id);
    if (countError) console.warn(`Error counting students for classroom ${classroom.id}: ${countError.message}`);
    classroom.studentIds = Array(studentCount || 0).fill(''); // Placeholder for count
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
    studentIds: [], // Placeholder, can be populated if needed but might be redundant here
    inviteCode: c.invite_code,
  }));
  
  // Optionally populate student counts if really needed for this view
  for (const classroom of classrooms) {
    const { count: studentCount, error: countError } = await supabase
      .from('classroom_students')
      .select('student_id', { count: 'exact', head: true })
      .eq('classroom_id', classroom.id);
    if (countError) console.warn(`Error counting students for classroom ${classroom.id}: ${countError.message}`);
    classroom.studentIds = Array(studentCount || 0).fill(''); // Placeholder for count
  }

  return classrooms;
}


export async function getClassroomById(classroomId: string): Promise<Classroom | null> {
  const { data, error } = await supabase
    .from('classrooms')
    .select('*, teacher:profiles!teacher_id(name)') // Renamed relation for clarity
    .eq('id', classroomId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
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
    studentIds: [], // To be populated by populateStudentDetailsForClassroom
    students: [],   // To be populated by populateStudentDetailsForClassroom
    inviteCode: data.invite_code,
  };

  await populateStudentDetailsForClassroom(classroom);
  return classroom;
}


export async function addStudentToClassroom(classroomId: string, studentId: string): Promise<Classroom | null> {
  const classroom = await getClassroomById(classroomId); // Fetch to ensure classroom exists
  if (!classroom) throw new Error("Classroom not found.");

  const student = await getUserById(studentId);
  if (!student || student.role !== UserRole.STUDENT) {
    throw new Error("Invalid student ID or user is not a student.");
  }

  // Check if student is already enrolled
  const { data: existingEntry, error: checkError } = await supabase
    .from('classroom_students')
    .select('*')
    .eq('classroom_id', classroomId)
    .eq('student_id', studentId)
    .maybeSingle(); // Use maybeSingle to avoid error if not found

  if (checkError && checkError.code !== 'PGRST116') { // PGRST116 means no rows, which is fine here
      console.error("Error checking existing student enrollment:", checkError);
      throw new Error(`Failed to check enrollment: ${checkError.message}`);
  }

  if (existingEntry) {
    // Student already enrolled, just return the classroom data with fresh student list
    await populateStudentDetailsForClassroom(classroom);
    return classroom;
  }

  // Add student
  const { error: insertError } = await supabase
    .from('classroom_students')
    .insert({ classroom_id: classroomId, student_id: studentId, enrolled_at: new Date().toISOString() });

  if (insertError) {
    console.error('Supabase addStudentToClassroom error:', insertError);
    throw new Error(`Failed to add student to classroom: ${insertError.message}`);
  }

  await populateStudentDetailsForClassroom(classroom); // Refresh student list
  return classroom;
}


export async function removeStudentFromClassroom(classroomId: string, studentId: string): Promise<Classroom | null> {
  const classroom = await getClassroomById(classroomId); // Fetch to ensure classroom exists
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

  await populateStudentDetailsForClassroom(classroom); // Refresh student list
  return classroom;
}


export async function updateClassroom(classroomId: string, updates: { name?: string; description?: string }): Promise<Classroom | null> {
  const classroomToUpdate = await getClassroomById(classroomId);
  if (!classroomToUpdate) return null; // Classroom not found

  const supabaseUpdates: any = {};
  if (updates.name !== undefined) supabaseUpdates.name = updates.name;
  if (updates.description !== undefined) supabaseUpdates.description = updates.description;
  
  if (Object.keys(supabaseUpdates).length === 0) {
      return classroomToUpdate; // No actual changes
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
  if (!data) return null; // Should not happen if update was successful and id is correct

  const updatedClassroom: Classroom = {
    id: data.id,
    name: data.name,
    description: data.description ?? undefined,
    teacherId: data.teacher_id,
    teacherName: (data.teacher as any)?.name || classroomToUpdate.teacherName, // Preserve if teacher not re-queried
    studentIds: classroomToUpdate.studentIds, // Preserve student list, can be repopulated if necessary
    students: classroomToUpdate.students,
    inviteCode: data.invite_code,
  };
  // Re-populate student details if structure changed significantly or if a fresh list is always needed
  await populateStudentDetailsForClassroom(updatedClassroom);

  return updatedClassroom;
}


export async function deleteClassroom(classroomId: string): Promise<boolean> {
  // First, remove all student enrollments for this classroom
  const { error: deleteEnrollmentsError } = await supabase
    .from('classroom_students')
    .delete()
    .eq('classroom_id', classroomId);

  if (deleteEnrollmentsError) {
    console.error('Supabase deleteClassroom (enrollments) error:', deleteEnrollmentsError);
    throw new Error(`Failed to delete student enrollments for classroom: ${deleteEnrollmentsError.message}`);
  }

  // Then, delete the classroom itself
  const { error: deleteClassroomError } = await supabase
    .from('classrooms')
    .delete()
    .eq('id', classroomId);

  if (deleteClassroomError) {
    console.error('Supabase deleteClassroom error:', deleteClassroomError);
    throw new Error(`Failed to delete classroom: ${deleteClassroomError.message}`);
  }

  // `delete` doesn't return data or count directly unless `select()` is added.
  // The absence of an error implies success if the row existed.
  // To be certain, one might check if the classroom still exists, but for now, we assume success if no error.
  return true;
}


export async function getAllClassrooms(): Promise<Classroom[]> {
  const { data, error } = await supabase
    .from('classrooms')
    .select('*, teacher:profiles!teacher_id(name)')
    .order('name', { ascending: true });

  if (error) {
    console.error('Supabase getAllClassrooms error:', error);
    throw new Error(`Failed to fetch all classrooms: ${error.message}`);
  }

  const classrooms = (data || []).map(c => ({
    id: c.id,
    name: c.name,
    description: c.description ?? undefined,
    teacherId: c.teacher_id,
    teacherName: (c.teacher as any)?.name || 'Unknown Teacher',
    studentIds: [], // For admin list, count is usually sufficient
    inviteCode: c.invite_code,
  }));
  
  // Populate student counts
  for (const classroom of classrooms) {
    const { count: studentCount, error: countError } = await supabase
      .from('classroom_students')
      .select('student_id', { count: 'exact', head: true })
      .eq('classroom_id', classroom.id);
    if (countError) console.warn(`Error counting students for classroom ${classroom.id}: ${countError.message}`);
    classroom.studentIds = Array(studentCount || 0).fill(''); // Using studentIds length for count
  }

  return classrooms;
}
