
'use server';

import { connectToDatabase } from '@/lib/mongodb';
import { FACULTY_SUBJECT_ASSIGNMENTS_COLLECTION, MOOC_COORDINATOR_ASSIGNMENTS_COLLECTION, USERS_COLLECTION } from '@/lib/constants';
import type { FacultySubjectAssignment, MoocCoordinatorAssignment, User } from '@/types';
import type { Collection } from 'mongodb';

async function getFacultyAssignmentsCollection(): Promise<Collection<FacultySubjectAssignment>> {
  const { db } = await connectToDatabase();
  return db.collection<FacultySubjectAssignment>(FACULTY_SUBJECT_ASSIGNMENTS_COLLECTION);
}

async function getMoocCoordinatorAssignmentsCollection(): Promise<Collection<MoocCoordinatorAssignment>> {
  const { db } = await connectToDatabase();
  return db.collection<MoocCoordinatorAssignment>(MOOC_COORDINATOR_ASSIGNMENTS_COLLECTION);
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

export async function fetchMoocCoordinatorAssignmentsForFaculty(facultyId: string): Promise<MoocCoordinatorAssignment[]> {
  try {
    const assignmentsCollection = await getMoocCoordinatorAssignmentsCollection();
    const assignments = await assignmentsCollection.find({ facultyId }).toArray();
    return assignments.map(a => {
        const idStr = a._id.toHexString();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _id, ...rest } = a;
        return { ...rest, id: idStr, _id: idStr } as MoocCoordinatorAssignment;
    });
  } catch (error) {
    console.error('Error fetching MOOC coordinator assignments for faculty:', error);
    throw new Error('Failed to fetch MOOC coordinator assignments.');
  }
}

export async function fetchMoocCoordinatorForSemesterAction(semester: number): Promise<MoocCoordinatorAssignment | null> {
  try {
    const assignmentsCollection = await getMoocCoordinatorAssignmentsCollection();
    const semesterNumber = typeof semester === 'string' ? parseInt(semester, 10) : semester;
    const assignment = await assignmentsCollection.findOne({ semester: semesterNumber });
    if (!assignment) return null;
    
    const idStr = assignment._id.toHexString();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, ...rest } = assignment;
    return { ...rest, id: idStr, _id: idStr } as MoocCoordinatorAssignment;

  } catch (error) {
    console.error(`Error fetching MOOC coordinator for semester ${semester}:`, error);
    throw new Error(`Failed to fetch MOOC coordinator for semester ${semester}.`);
  }
}

