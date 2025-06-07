
'use server';

import { connectToDatabase } from '@/lib/mongodb';
import { 
  FACULTY_SUBJECT_ASSIGNMENTS_COLLECTION, 
  MOOC_COORDINATOR_ASSIGNMENTS_COLLECTION,
  SUBJECTS_COLLECTION, // Added
  USERS_COLLECTION
} from '@/lib/constants';
import type { FacultySubjectAssignment, MoocCoordinatorAssignment, User, Subject } from '@/types'; // Added Subject
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

async function getSubjectsCollection(): Promise<Collection<Subject>> {
  const { db } = await connectToDatabase();
  return db.collection<Subject>(SUBJECTS_COLLECTION);
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
    
    const result = await assignmentsCollection.findOneAndUpdate(
      { semester: semester },
      { $set: { facultyId: facultyId, semester: semester } },
      { upsert: true, returnDocument: 'after' }
    );

    if (!result) throw new Error('Failed to assign MOOC coordinator.');
    
    const assignedDoc = result as MoocCoordinatorAssignment; 
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


// --- Subject Management Actions ---

export async function fetchSubjectsByDepartmentAndSemesterAction(department: string, semester: number): Promise<Subject[]> {
  try {
    const subjectsCollection = await getSubjectsCollection();
    const subjectsCursor = subjectsCollection.find({ department, semester: Number(semester) });
    const subjectsArray = await subjectsCursor.toArray();
    return subjectsArray.map(s => ({
        ...s,
        id: s._id.toHexString(),
        _id: s._id.toHexString(),
    }));
  } catch (error) {
    console.error('Error fetching subjects by department and semester:', error);
    throw new Error('Failed to fetch subjects.');
  }
}

export async function addSubjectAction(
  department: string,
  semester: number,
  subjectCode: string,
  subjectName: string,
  credits: number
): Promise<Subject> {
  try {
    const subjectsCollection = await getSubjectsCollection();
    const existingSubject = await subjectsCollection.findOne({ department, semester: Number(semester), subjectCode });
    if (existingSubject) {
      throw new Error(`Subject with code ${subjectCode} already exists for ${department} - Semester ${semester}.`);
    }

    const newSubjectData: Omit<Subject, 'id' | '_id'> = {
      department,
      semester: Number(semester),
      subjectCode,
      subjectName,
      credits: Number(credits),
    };
    const result = await subjectsCollection.insertOne(newSubjectData as Subject);
    const insertedIdStr = result.insertedId.toHexString();
    return { ...newSubjectData, id: insertedIdStr, _id: insertedIdStr } as Subject;
  } catch (error) {
    console.error('Error adding subject:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to add subject.';
    throw new Error(errorMessage);
  }
}

export async function deleteSubjectAction(subjectId: string): Promise<boolean> {
  try {
    const subjectsCollection = await getSubjectsCollection();
    const result = await subjectsCollection.deleteOne({ _id: new ObjectId(subjectId) });
    return result.deletedCount === 1;
  } catch (error) {
    console.error('Error deleting subject:', error);
    throw new Error('Failed to delete subject.');
  }
}
