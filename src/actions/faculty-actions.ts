
'use server';

import { connectToDatabase } from '@/lib/mongodb';
import { FACULTY_SUBJECT_ASSIGNMENTS_COLLECTION, USERS_COLLECTION } from '@/lib/constants';
import type { FacultySubjectAssignment, User } from '@/types';
import type { Collection } from 'mongodb';

async function getFacultyAssignmentsCollection(): Promise<Collection<FacultySubjectAssignment>> {
  const { db } = await connectToDatabase();
  return db.collection<FacultySubjectAssignment>(FACULTY_SUBJECT_ASSIGNMENTS_COLLECTION);
}

async function getUsersCollection(): Promise<Collection<User>> {
  const { db } = await connectToDatabase();
  return db.collection<User>(USERS_COLLECTION);
}

export async function fetchFacultyAssignmentsForClassAction(
  facultyId: string,
  semester: number,
  section: string
): Promise<FacultySubjectAssignment[]> {
  try {
    const assignmentsCollection = await getFacultyAssignmentsCollection();
    // Ensure semester is treated as a number for the query
    const semesterNumber = typeof semester === 'string' ? parseInt(semester, 10) : semester;

    const assignments = await assignmentsCollection.find({ 
      facultyId, 
      semester: semesterNumber, 
      section 
    }).toArray();
    
    return assignments.map(a => {
        const idStr = a._id.toHexString();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _id, ...rest } = a;
        return { ...rest, id: idStr, _id: idStr } as FacultySubjectAssignment;
    });
  } catch (error) {
    console.error('Error fetching faculty assignments for class:', error);
    throw new Error('Failed to fetch faculty assignments.');
  }
}

export async function fetchAllActiveFacultyAction(): Promise<User[]> {
  try {
    const usersCollection = await getUsersCollection();
    const facultyUsers = await usersCollection.find({ role: 'Faculty', status: 'Active' }).toArray();
    return facultyUsers.map(u => {
      const idStr = u._id.toHexString();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, password, ...rest } = u;
      return { ...rest, id: idStr, _id: idStr };
    });
  } catch (error) {
    console.error('Error fetching active faculty:', error);
    throw new Error('Failed to fetch active faculty members.');
  }
}
