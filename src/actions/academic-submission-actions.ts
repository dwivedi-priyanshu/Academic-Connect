
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
    return moocsArray.map(mooc => {
        const idStr = mooc._id.toHexString();
        const { _id, ...rest } = mooc;
        return { ...rest, id: idStr, _id: idStr } as MoocCourse;
    });
  } catch (error) {
    console.error('Error fetching student MOOCs:', error);
    throw new Error('Failed to fetch MOOCs.');
  }
}

export async function saveStudentMoocAction(moocData: Omit<MoocCourse, 'id' | 'submittedDate' | 'status' | '_id'> & { id?: string }, studentId: string): Promise<MoocCourse> {
  try {
    const moocsCollection = await getMoocsCollection();
    let savedMooc: MoocCourse;

    if (moocData.id && moocData.id !== 'new') { // Update existing
      const { id, ...dataToUpdateFromClient } = moocData;
      // Ensure _id is not part of the $set operation.
      // The `moocData` type `Omit`s `_id`, but runtime spread `...currentMooc` might re-introduce it.
      const dataToUpdate = { ...dataToUpdateFromClient };
      delete (dataToUpdate as any)._id; 

      const result = await moocsCollection.findOneAndUpdate(
        { _id: new ObjectId(id), studentId },
        { $set: dataToUpdate },
        { returnDocument: 'after' }
      );
      if (!result) throw new Error('MOOC not found or access denied.');
      const updatedDoc = result as MoocCourse; 
      const idStr = updatedDoc._id.toHexString();
      const { _id, ...rest } = updatedDoc;
      savedMooc = { ...rest, id: idStr, _id: idStr } as MoocCourse;
    } else { // Create new
      const newMoocInternal: Omit<MoocCourse, 'id' | '_id'> = {
        ...moocData,
        studentId,
        submittedDate: new Date().toISOString(),
        status: 'Pending',
      };
      const result = await moocsCollection.insertOne(newMoocInternal as MoocCourse);
      const insertedIdStr = result.insertedId.toHexString();
      savedMooc = { ...newMoocInternal, id: insertedIdStr, _id: insertedIdStr } as MoocCourse;
    }
    return savedMooc;
  } catch (error) {
    console.error('Error saving MOOC:', error);
    let errorMessage = 'Failed to save MOOC.';
    if (error instanceof Error && error.message) {
      errorMessage += ` Details: ${error.message}`;
    }
    throw new Error(errorMessage);
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
    return projectsArray.map(proj => {
        const idStr = proj._id.toHexString();
        const { _id, ...rest } = proj;
        return { ...rest, id: idStr, _id: idStr } as MiniProject;
    });
  } catch (error) {
    console.error('Error fetching student projects:', error);
    throw new Error('Failed to fetch projects.');
  }
}

export async function saveStudentProjectAction(projectData: Omit<MiniProject, 'id' | 'submittedDate' | 'status' | '_id'> & { id?: string }, studentId: string): Promise<MiniProject> {
  try {
    const projectsCollection = await getProjectsCollection();
    let savedProject: MiniProject;

    if (projectData.id && projectData.id !== 'new') { // Update existing
      const { id, ...dataToUpdateFromClient } = projectData;
      // Ensure _id is not part of the $set operation.
      // The `projectData` type `Omit`s `_id`, but runtime spread `...currentProject` might re-introduce it.
      const dataToUpdate = { ...dataToUpdateFromClient };
      delete (dataToUpdate as any)._id;

      const result = await projectsCollection.findOneAndUpdate(
        { _id: new ObjectId(id), studentId },
        { $set: dataToUpdate },
        { returnDocument: 'after' }
      );
      if (!result) throw new Error('Project not found or access denied.');
      const updatedDoc = result as MiniProject;
      const idStr = updatedDoc._id.toHexString();
      const { _id, ...rest } = updatedDoc;
      savedProject = { ...rest, id: idStr, _id: idStr } as MiniProject;

    } else { // Create new
      const newProjectInternal: Omit<MiniProject, 'id' | '_id'> = {
        ...projectData,
        studentId,
        submittedDate: new Date().toISOString(),
        status: 'Pending', 
      };
      const result = await projectsCollection.insertOne(newProjectInternal as MiniProject);
      const insertedIdStr = result.insertedId.toHexString();
      savedProject = { ...newProjectInternal, id: insertedIdStr, _id: insertedIdStr } as MiniProject;
    }
     return savedProject;
  } catch (error) {
    console.error('Error saving project:', error); 
    let errorMessage = 'Failed to save project.';
    if (error instanceof Error && error.message) {
      errorMessage += ` Details: ${error.message}`;
    }
    throw new Error(errorMessage); 
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
    console.log(`Fetching pending submissions (faculty: ${facultyId})`);
    
    const projectsCollection = await getProjectsCollection();
    const pendingProjectsCursor = projectsCollection.find({ status: 'Pending' });
    const pendingProjectsArray = (await pendingProjectsCursor.toArray()).map(p => {
        const idStr = p._id.toHexString();
        const { _id, ...rest } = p;
        return { ...rest, id: idStr, _id: idStr } as MiniProject;
    });

    const moocsCollection = await getMoocsCollection();
    const pendingMoocsCursor = moocsCollection.find({ status: 'Pending' });
    const pendingMoocsArray = (await pendingMoocsCursor.toArray()).map(m => {
        const idStr = m._id.toHexString();
        const { _id, ...rest } = m;
        return { ...rest, id: idStr, _id: idStr } as MoocCourse;
    });
    
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

