
'use server';

import { connectToDatabase } from '@/lib/mongodb';
import { MOOCS_COLLECTION, PROJECTS_COLLECTION, STUDENT_PROFILES_COLLECTION, USERS_COLLECTION } from '@/lib/constants';
import type { MiniProject, MoocCourse, SubmissionStatus, User, StudentProfile, MoocCourseWithStudentInfo } from '@/types';
import { ObjectId } from 'mongodb';
import type { Collection, Filter } from 'mongodb';
import { fetchMoocCoordinatorForSemesterAction } from './faculty-actions';
import { fetchStudentFullProfileDataAction } from './profile-actions';
import { uploadStreamToCloudinary } from '@/lib/cloudinary'; 

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
export async function fetchStudentMoocsAction(studentId: string, semester?: number): Promise<MoocCourse[]> {
  try {
    const moocsCollection = await getMoocsCollection();
    const query: Filter<MoocCourse> = { studentId };
    if (semester !== undefined && !isNaN(semester)) {
      query.submissionSemester = semester;
    }
    const moocsCursor = moocsCollection.find(query);
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

export async function saveStudentMoocAction(formData: FormData, studentId: string): Promise<MoocCourse> {
  try {
    const moocsCollection = await getMoocsCollection();
    let savedMooc: MoocCourse;

    const id = formData.get('id') as string | undefined;
    const courseName = formData.get('courseName') as string;
    const platform = formData.get('platform') as string;
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;
    const creditsEarnedStr = formData.get('creditsEarned') as string | null;
    const creditsEarned = creditsEarnedStr ? parseFloat(creditsEarnedStr) : undefined;
    let existingCertificateUrl = formData.get('existingCertificateUrl') as string | undefined;
    if (existingCertificateUrl === 'undefined' || existingCertificateUrl === 'null') {
        existingCertificateUrl = undefined;
    }

    const certificateFile = formData.get('certificateFile') as File | null;
    let certificateCloudUrl: string | undefined = existingCertificateUrl;

    if (certificateFile && certificateFile.size > 0) {
      const fileBuffer = Buffer.from(await certificateFile.arrayBuffer());
      const originalFileName = certificateFile.name;
      const safeFileName = originalFileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const resourceTypeForCert = (certificateFile.type === 'application/pdf' || certificateFile.name.toLowerCase().endsWith('.pdf')) ? 'raw' : 'auto';
      certificateCloudUrl = await uploadStreamToCloudinary(fileBuffer, `mooc_certificates/${studentId}`, safeFileName, resourceTypeForCert);
    }

    const moocData: Omit<MoocCourse, 'id' | '_id' | 'submittedDate' | 'status' | 'submissionSemester'> & { studentId: string; certificateUrl?: string } = {
      studentId,
      courseName,
      platform,
      startDate,
      endDate,
      creditsEarned,
      certificateUrl: certificateCloudUrl,
    };

    if (id && id !== 'new') { 
      const dataToUpdate = { ...moocData };
      delete (dataToUpdate as any).studentId; 
      delete (dataToUpdate as any).submissionSemester; 

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
    } else { 
      const studentProfile = await fetchStudentFullProfileDataAction(studentId);
      if (!studentProfile) {
        throw new Error('Student profile not found, cannot determine submission semester.');
      }

      const newMoocInternal: Omit<MoocCourse, 'id' | '_id'> = {
        ...moocData,
        studentId,
        submittedDate: new Date().toISOString(),
        status: 'Pending',
        submissionSemester: studentProfile.currentSemester,
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
export async function fetchStudentProjectsAction(studentId: string, semester?: number): Promise<MiniProject[]> {
  try {
    const projectsCollection = await getProjectsCollection();
    const query: Filter<MiniProject> = { studentId };
    if (semester !== undefined && !isNaN(semester)) {
      query.submissionSemester = semester;
    }
    const projectsCursor = projectsCollection.find(query);
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

export async function saveStudentProjectAction(formData: FormData, studentId: string): Promise<MiniProject> {
  try {
    const projectsCollection = await getProjectsCollection();
    let savedProject: MiniProject;

    const id = formData.get('id') as string | undefined;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const subject = formData.get('subject') as string;
    const guideId = formData.get('guideId') as string | undefined;
    let existingPptUrl = formData.get('existingPptUrl') as string | undefined;
    let existingReportUrl = formData.get('existingReportUrl') as string | undefined;
    if (existingPptUrl === 'undefined' || existingPptUrl === 'null') existingPptUrl = undefined;
    if (existingReportUrl === 'undefined' || existingReportUrl === 'null') existingReportUrl = undefined;


    const pptFile = formData.get('pptFile') as File | null;
    const reportFile = formData.get('reportFile') as File | null;

    let pptCloudUrl: string | undefined = existingPptUrl;
    let reportCloudUrl: string | undefined = existingReportUrl;

    const uploadFile = async (file: File, type: 'ppt' | 'report'): Promise<string | undefined> => {
      if (file && file.size > 0) {
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const originalFileName = file.name;
        const safeFileName = originalFileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const resourceType = (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) ? 'raw' : 'auto';
        return uploadStreamToCloudinary(fileBuffer, `project_files/${studentId}/${type}`, safeFileName, resourceType);
      }
      return undefined;
    };

    if (pptFile) pptCloudUrl = await uploadFile(pptFile, 'ppt') || existingPptUrl;
    if (reportFile) reportCloudUrl = await uploadFile(reportFile, 'report') || existingReportUrl;

    const projectData: Omit<MiniProject, 'id' | '_id' | 'submittedDate' | 'status' | 'submissionSemester'> & { studentId: string } = {
      studentId,
      title,
      description,
      subject,
      guideId: guideId === 'undefined' || guideId === '' ? undefined : guideId, 
      pptUrl: pptCloudUrl,
      reportUrl: reportCloudUrl,
    };


    if (id && id !== 'new') { 
      const dataToUpdate = { ...projectData };
      delete (dataToUpdate as any).studentId; 
      delete (dataToUpdate as any).submissionSemester; 

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

    } else { 
      const studentProfile = await fetchStudentFullProfileDataAction(studentId);
      if (!studentProfile) {
        throw new Error('Student profile not found, cannot determine submission semester.');
      }
      const newProjectInternal: Omit<MiniProject, 'id' | '_id'> = {
        ...projectData,
        studentId, 
        submittedDate: new Date().toISOString(),
        status: 'Pending', 
        submissionSemester: studentProfile.currentSemester,
        guideId: projectData.guideId,
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
export async function fetchPendingSubmissionsAction(facultyId: string): Promise<{ projects: MiniProject[], moocs: MoocCourseWithStudentInfo[] }> {
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
    const studentProfilesCollection = await getStudentProfilesCollection();
    const pendingMoocsCursor = moocsCollection.find({ status: 'Pending' });
    const pendingMoocsArray = await pendingMoocsCursor.toArray();
    
    const moocsWithStudentInfo: MoocCourseWithStudentInfo[] = [];
    for (const moocDoc of pendingMoocsArray) {
        const studentProfile = await studentProfilesCollection.findOne({ userId: moocDoc.studentId });
        const idStr = moocDoc._id.toHexString();
        const { _id, ...restOfMooc } = moocDoc;
        moocsWithStudentInfo.push({
            ...restOfMooc,
            id: idStr,
            _id: idStr,
            studentName: studentProfile?.fullName || 'Unknown Student',
            studentSemester: studentProfile?.currentSemester || 0, 
        } as MoocCourseWithStudentInfo);
    }
    
    return { projects: pendingProjectsArray, moocs: moocsWithStudentInfo };
  } catch (error) {
    console.error('Error fetching pending submissions:', error);
    throw new Error('Failed to fetch pending submissions.');
  }
}

export async function fetchFacultyApprovedProjectsAction(facultyId: string): Promise<MiniProject[]> {
  try {
    const projectsCollection = await getProjectsCollection();
    const studentProfilesCollection = await getStudentProfilesCollection();
    const usersCollection = await getUsersCollection();

    // Fetch projects approved by this facultyId
    const approvedProjectsCursor = projectsCollection.find({ status: 'Approved', facultyId: facultyId });
    const approvedProjectsArray = await approvedProjectsCursor.toArray();

    const projectsWithDetails: MiniProject[] = [];
    for (const projectDoc of approvedProjectsArray) {
      let studentName = 'Unknown Student';
      const studentProfile = await studentProfilesCollection.findOne({ userId: projectDoc.studentId });
      if (studentProfile) {
        studentName = studentProfile.fullName;
      }
      
      let guideName = 'N/A';
      if (projectDoc.guideId) {
        const guideUser = ObjectId.isValid(projectDoc.guideId) 
            ? await usersCollection.findOne({ _id: new ObjectId(projectDoc.guideId) })
            : await usersCollection.findOne({ id: projectDoc.guideId });
        if (guideUser) {
          guideName = guideUser.name;
        }
      }
      
      const idStr = projectDoc._id.toHexString();
      const { _id, ...rest } = projectDoc;
      projectsWithDetails.push({
        ...rest,
        id: idStr,
        _id: idStr,
        studentName: studentName,
        guideName: guideName,
      } as MiniProject);
    }
    return projectsWithDetails;
  } catch (error) {
    console.error('Error fetching faculty approved projects:', error);
    throw new Error('Failed to fetch projects approved by you.');
  }
}

export async function fetchAllApprovedProjectsAction(): Promise<MiniProject[]> {
  try {
    const projectsCollection = await getProjectsCollection();
    const studentProfilesCollection = await getStudentProfilesCollection();
    const usersCollection = await getUsersCollection();

    const approvedProjectsCursor = projectsCollection.find({ status: 'Approved' });
    const approvedProjectsArray = await approvedProjectsCursor.toArray();

    const projectsWithDetails: MiniProject[] = [];
    for (const projectDoc of approvedProjectsArray) {
      let studentName = 'Unknown Student';
      const studentProfile = await studentProfilesCollection.findOne({ userId: projectDoc.studentId });
      if (studentProfile) {
        studentName = studentProfile.fullName;
      }
      
      let guideName = 'N/A';
      if (projectDoc.guideId) {
         const guideUser = ObjectId.isValid(projectDoc.guideId) 
            ? await usersCollection.findOne({ _id: new ObjectId(projectDoc.guideId) })
            : await usersCollection.findOne({ id: projectDoc.guideId });
        if (guideUser) {
          guideName = guideUser.name;
        }
      }
      
      const idStr = projectDoc._id.toHexString();
      const { _id, ...rest } = projectDoc;
      projectsWithDetails.push({
        ...rest,
        id: idStr,
        _id: idStr,
        studentName: studentName,
        guideName: guideName,
      } as MiniProject);
    }
    return projectsWithDetails.sort((a, b) => new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime()); // Sort by newest first
  } catch (error) {
    console.error('Error fetching all approved projects:', error);
    throw new Error('Failed to fetch all approved projects.');
  }
}


export async function updateSubmissionStatusAction(
  submissionId: string,
  type: 'project' | 'mooc',
  newStatus: SubmissionStatus, 
  remarks: string,
  facultyId: string 
): Promise<boolean> {
  try {
    let collection: Collection<MiniProject> | Collection<MoocCourse>;
    
    if (type === 'project') {
      collection = await getProjectsCollection();
      const project = await collection.findOne({ _id: new ObjectId(submissionId) }) as MiniProject | null;
      
      if (!project) throw new Error("Project not found.");
      if (!project.guideId) {
        throw new Error("Project cannot be actioned: No guide has been assigned.");
      }
      if (project.guideId !== facultyId) {
        throw new Error("Action restricted: You are not the assigned guide for this project.");
      }
    } else { // type === 'mooc'
      collection = await getMoocsCollection();
      const mooc = await collection.findOne({ _id: new ObjectId(submissionId) }) as MoocCourse | null;
      if (!mooc) throw new Error("MOOC submission not found.");

      const studentProfile = await fetchStudentFullProfileDataAction(mooc.studentId);
      if (!studentProfile || !studentProfile.currentSemester) {
        throw new Error("Action failed: Could not determine student's current semester for MOOC approval.");
      }

      const coordinator = await fetchMoocCoordinatorForSemesterAction(studentProfile.currentSemester);
      if (!coordinator) {
        throw new Error(`Action failed: No MOOC coordinator is assigned for Semester ${studentProfile.currentSemester}.`);
      }
      if (coordinator.facultyId !== facultyId) {
        throw new Error(`Action restricted: You are not the MOOC coordinator for Semester ${studentProfile.currentSemester}.`);
      }
    }
    
    const result = await collection.updateOne(
      { _id: new ObjectId(submissionId) },
      { $set: { status: newStatus, remarks, facultyId } } 
    );
    return result.modifiedCount === 1;
  } catch (error) {
    console.error(`Error updating ${type} status:`, error);
    if (error instanceof Error) {
      throw new Error(error.message || `Failed to update ${type} status.`);
    }
    throw new Error(`Failed to update ${type} status.`);
  }
}

