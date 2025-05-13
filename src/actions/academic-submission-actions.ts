
'use server';

import { connectToDatabase } from '@/lib/mongodb';
import { MOOCS_COLLECTION, PROJECTS_COLLECTION, STUDENT_PROFILES_COLLECTION, USERS_COLLECTION } from '@/lib/constants';
import type { MiniProject, MoocCourse, SubmissionStatus, User, StudentProfile } from '@/types';
import { ObjectId } from 'mongodb';
import type { Collection, Filter } from 'mongodb';

// Helper to get collections
async function getMoocsCollection(): Promise<Collection<MoocCourse>> {
  const { db } = await connectToDatabase();
  return db.collection<MoocCourse>(MOOCS_COLLECTION);
}

async function getProjectsCollection(): Promise<Collection<MiniProject>> {
  const { db } = await connectToDatabase();
  return db.collection<MiniProject>(PROJECTS_COLLECTION);
}
async function getStudentProfilesCollection(): Promise<Collection<StudentProfile>> {
  const { db } = await connectToDatabase();
  return db.collection<StudentProfile>(STUDENT_PROFILES_COLLECTION);
}

async function getUsersCollection(): Promise<Collection<User>> {
  const { db } = await connectToDatabase();
  return db.collection<User>(USERS_COLLECTION);
}


// MOOC Actions
export async function fetchStudentMoocsAction(studentId: string): Promise<MoocCourse[]> {
  try {
    const moocsCollection = await getMoocsCollection();
    const moocsCursor = moocsCollection.find({ studentId });
    const moocsArray = await moocsCursor.toArray();
    return moocsArray.map(mooc => ({ ...mooc, id: mooc._id.toHexString() } as MoocCourse));
  } catch (error) {
    console.error('Error fetching student MOOCs:', error);
    throw new Error('Failed to fetch MOOCs.');
  }
}

export async function saveStudentMoocAction(moocData: Omit<MoocCourse, 'id' | 'submittedDate' | 'status'> & { id?: string }, studentId: string): Promise<MoocCourse> {
  try {
    const moocsCollection = await getMoocsCollection();
    let savedMooc;

    if (moocData.id && moocData.id !== 'new') { // Update existing
      const { id, ...dataToUpdate } = moocData;
      const result = await moocsCollection.findOneAndUpdate(
        { _id: new ObjectId(id), studentId },
        { $set: dataToUpdate },
        { returnDocument: 'after' }
      );
      if (!result) throw new Error('MOOC not found or access denied.');
      savedMooc = result as MoocCourse;
    } else { // Create new
      const newMooc: Omit<MoocCourse, 'id' | '_id'> = {
        ...moocData,
        studentId,
        submittedDate: new Date().toISOString(),
        status: 'Pending',
      };
      const result = await moocsCollection.insertOne(newMooc as MoocCourse);
      savedMooc = { ...newMooc, id: result.insertedId.toHexString() } as MoocCourse;
    }
    return { ...savedMooc, id: savedMooc._id.toHexString()} as MoocCourse;
  } catch (error) {
    console.error('Error saving MOOC:', error);
    throw new Error('Failed to save MOOC.');
  }
}

export async function deleteStudentMoocAction(moocId: string, studentId: string): Promise<boolean> {
  try {
    const moocsCollection = await getMoocsCollection();
    const result = await moocsCollection.deleteOne({ _id: new ObjectId(moocId), studentId });
    return result.deletedCount === 1;
  } catch (error) {
    console.error('Error deleting MOOC:', error);
    throw new Error('Failed to delete MOOC.');
  }
}

// Project Actions
export async function fetchStudentProjectsAction(studentId: string): Promise<MiniProject[]> {
  try {
    const projectsCollection = await getProjectsCollection();
    const projectsCursor = projectsCollection.find({ studentId });
    const projectsArray = await projectsCursor.toArray();
    return projectsArray.map(proj => ({ ...proj, id: proj._id.toHexString() } as MiniProject));
  } catch (error) {
    console.error('Error fetching student projects:', error);
    throw new Error('Failed to fetch projects.');
  }
}

export async function saveStudentProjectAction(projectData: Omit<MiniProject, 'id' | 'submittedDate' | 'status'> & { id?: string }, studentId: string): Promise<MiniProject> {
  try {
    const projectsCollection = await getProjectsCollection();
    let savedProject;

    if (projectData.id && projectData.id !== 'new') { // Update existing
      const { id, ...dataToUpdate } = projectData;
      const result = await projectsCollection.findOneAndUpdate(
        { _id: new ObjectId(id), studentId },
        { $set: dataToUpdate },
        { returnDocument: 'after' }
      );
      if (!result) throw new Error('Project not found or access denied.');
      savedProject = result as MiniProject;

    } else { // Create new
      const newProject: Omit<MiniProject, 'id' | '_id'> = {
        ...projectData,
        studentId,
        submittedDate: new Date().toISOString(),
        status: 'Pending',
      };
      const result = await projectsCollection.insertOne(newProject as MiniProject);
      savedProject = { ...newProject, id: result.insertedId.toHexString() } as MiniProject;
    }
     return { ...savedProject, id: savedProject._id.toHexString()} as MiniProject;
  } catch (error) {
    console.error('Error saving project:', error);
    throw new Error('Failed to save project.');
  }
}

export async function deleteStudentProjectAction(projectId: string, studentId: string): Promise<boolean> {
  try {
    const projectsCollection = await getProjectsCollection();
    const result = await projectsCollection.deleteOne({ _id: new ObjectId(projectId), studentId });
    return result.deletedCount === 1;
  } catch (error) {
    console.error('Error deleting project:', error);
    throw new Error('Failed to delete project.');
  }
}

// Faculty Approval Actions
export async function fetchPendingSubmissionsAction(facultyId: string): Promise<{ projects: MiniProject[], moocs: MoocCourse[] }> {
  try {
    // In a real app, facultyId would be used to filter submissions
    // for students associated with this faculty.
    // For now, fetching all pending.
    console.log(`Fetching pending submissions (faculty: ${facultyId})`);
    
    const projectsCollection = await getProjectsCollection();
    const pendingProjectsCursor = projectsCollection.find({ status: 'Pending' });
    const pendingProjectsArray = (await pendingProjectsCursor.toArray()).map(p => ({...p, id: p._id.toHexString()}) as MiniProject);

    const moocsCollection = await getMoocsCollection();
    const pendingMoocsCursor = moocsCollection.find({ status: 'Pending' });
    const pendingMoocsArray = (await pendingMoocsCursor.toArray()).map(m => ({...m, id: m._id.toHexString()}) as MoocCourse);
    
    return { projects: pendingProjectsArray, moocs: pendingMoocsArray };
  } catch (error) {
    console.error('Error fetching pending submissions:', error);
    throw new Error('Failed to fetch pending submissions.');
  }
}

export async function updateSubmissionStatusAction(
  submissionId: string,
  type: 'project' | 'mooc',
  status: SubmissionStatus,
  remarks: string,
  facultyId: string
): Promise<boolean> {
  try {
    const collection = type === 'project' ? await getProjectsCollection() : await getMoocsCollection();
    const result = await collection.updateOne(
      { _id: new ObjectId(submissionId) },
      { $set: { status, remarks, facultyId } }
    );
    return result.modifiedCount === 1;
  } catch (error) {
    console.error(`Error updating ${type} status:`, error);
    throw new Error(`Failed to update ${type} status.`);
  }
}
