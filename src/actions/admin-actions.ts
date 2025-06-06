
'use server';

import { connectToDatabase } from '@/lib/mongodb';
import { 
  FACULTY_SUBJECT_ASSIGNMENTS_COLLECTION, 
  MOOC_COORDINATOR_ASSIGNMENTS_COLLECTION,
  USERS_COLLECTION
} from '@/lib/constants';
import type { FacultySubjectAssignment, MoocCoordinatorAssignment, User } from '@/types';
import type { Collection } from 'mongodb';
import { ObjectId } from 'mongodb';

// Helper to get collections
async function getFacultySubjectAssignmentsCollection(): Promise<Collection<FacultySubjectAssignment>> {
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

// --- Faculty Subject Assignment Actions ---

export async function fetchAllFacultySubjectAssignmentsWithNamesAction(): Promise<FacultySubjectAssignment[]> {
  try {
    const assignmentsCollection = await getFacultySubjectAssignmentsCollection();
    const usersCollection = await getUsersCollection();
    const assignments = await assignmentsCollection.find({}).toArray();

    const assignmentsWithNames: FacultySubjectAssignment[] = [];
    for (const assignment of assignments) {
      const faculty = await usersCollection.findOne({ id: assignment.facultyId });
      assignmentsWithNames.push({
        ...assignment,
        id: assignment._id.toHexString(),
        _id: assignment._id.toHexString(),
        facultyName: faculty?.name || 'Unknown Faculty',
      });
    }
    return assignmentsWithNames;
  } catch (error) {
    console.error('Error fetching all faculty subject assignments:', error);
    throw new Error('Failed to fetch faculty subject assignments.');
  }
}

export async function addFacultySubjectAssignmentAction(
  assignmentData: Omit<FacultySubjectAssignment, 'id' | '_id' | 'facultyName'>
): Promise<FacultySubjectAssignment> {
  try {
    const assignmentsCollection = await getFacultySubjectAssignmentsCollection();
    // Check for existing assignment for the same faculty, subject, semester, section
    const existing = await assignmentsCollection.findOne({
      facultyId: assignmentData.facultyId,
      subjectCode: assignmentData.subjectCode,
      semester: assignmentData.semester,
      section: assignmentData.section,
    });
    if (existing) {
      throw new Error('This faculty is already assigned this subject for the selected class.');
    }

    const result = await assignmentsCollection.insertOne(assignmentData as FacultySubjectAssignment);
    const newAssignmentId = result.insertedId.toHexString();

    const usersCollection = await getUsersCollection();
    const faculty = await usersCollection.findOne({ id: assignmentData.facultyId });
    
    return { 
        ...assignmentData, 
        id: newAssignmentId, 
        _id: newAssignmentId,
        facultyName: faculty?.name || 'Unknown Faculty' 
    };
  } catch (error) {
    console.error('Error adding faculty subject assignment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to add faculty subject assignment.';
    throw new Error(errorMessage);
  }
}

export async function deleteFacultySubjectAssignmentAction(assignmentId: string): Promise<boolean> {
  try {
    const assignmentsCollection = await getFacultySubjectAssignmentsCollection();
    const result = await assignmentsCollection.deleteOne({ _id: new ObjectId(assignmentId) });
    return result.deletedCount === 1;
  } catch (error) {
    console.error('Error deleting faculty subject assignment:', error);
    throw new Error('Failed to delete faculty subject assignment.');
  }
}

// --- MOOC Coordinator Assignment Actions ---

export async function fetchAllMoocCoordinatorAssignmentsWithFacultyNamesAction(): Promise<MoocCoordinatorAssignment[]> {
  try {
    const assignmentsCollection = await getMoocCoordinatorAssignmentsCollection();
    const usersCollection = await getUsersCollection();
    const assignments = await assignmentsCollection.find({}).sort({ semester: 1 }).toArray();

    const assignmentsWithNames: MoocCoordinatorAssignment[] = [];
    for (const assignment of assignments) {
      const faculty = await usersCollection.findOne({ id: assignment.facultyId });
      assignmentsWithNames.push({
        ...assignment,
        id: assignment._id.toHexString(),
        _id: assignment._id.toHexString(),
        facultyName: faculty?.name || 'Unknown Faculty',
      });
    }
    return assignmentsWithNames;
  } catch (error) {
    console.error('Error fetching MOOC coordinator assignments:', error);
    throw new Error('Failed to fetch MOOC coordinator assignments.');
  }
}

export async function assignMoocCoordinatorAction(facultyId: string, semester: number): Promise<MoocCoordinatorAssignment> {
  try {
    const assignmentsCollection = await getMoocCoordinatorAssignmentsCollection();
    
    // Upsert: Update if exists for that semester, or insert if not.
    // This ensures only one coordinator per semester.
    const result = await assignmentsCollection.findOneAndUpdate(
      { semester: semester },
      { $set: { facultyId: facultyId, semester: semester } },
      { upsert: true, returnDocument: 'after' }
    );

    if (!result) throw new Error('Failed to assign MOOC coordinator.');
    
    const assignedDoc = result as MoocCoordinatorAssignment; // result includes the value after update/insert
    const usersCollection = await getUsersCollection();
    const faculty = await usersCollection.findOne({ id: facultyId });

    return {
      id: assignedDoc._id.toHexString(),
      _id: assignedDoc._id.toHexString(),
      facultyId: assignedDoc.facultyId,
      semester: assignedDoc.semester,
      facultyName: faculty?.name || 'Unknown Faculty',
    };

  } catch (error) {
    console.error('Error assigning MOOC coordinator:', error);
    throw new Error('Failed to assign MOOC coordinator.');
  }
}

export async function deleteMoocCoordinatorAssignmentAction(assignmentId: string): Promise<boolean> {
  try {
    const assignmentsCollection = await getMoocCoordinatorAssignmentsCollection();
    const result = await assignmentsCollection.deleteOne({ _id: new ObjectId(assignmentId) });
    return result.deletedCount === 1;
  } catch (error) {
    console.error('Error deleting MOOC coordinator assignment:', error);
    throw new Error('Failed to delete MOOC coordinator assignment.');
  }
}
