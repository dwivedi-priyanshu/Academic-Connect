
'use server';

import { z } from 'zod';
import type { SubjectMark, StudentProfile, User, StudentClassPerformanceDetails, Subject } from '@/types'; 
import { connectToDatabase } from '@/lib/mongodb';
import { MARKS_COLLECTION, STUDENT_PROFILES_COLLECTION, USERS_COLLECTION } from '@/lib/constants'; 
import type { Collection, Filter } from 'mongodb';
import { ObjectId } from 'mongodb';
import { fetchStudentsForFacultyAction } from './profile-actions'; 
import { fetchSubjectsByDepartmentAndSemesterAction } from './admin-actions'; // For fetching subjects dynamically


async function getMarksCollection(): Promise<Collection<SubjectMark>> {
  const { db } = await connectToDatabase();
  return db.collection<SubjectMark>(MARKS_COLLECTION);
}

async function getStudentProfilesCollection(): Promise<Collection<StudentProfile>> {
  const { db } = await connectToDatabase();
  return db.collection<StudentProfile>(STUDENT_PROFILES_COLLECTION);
}

async function getUsersCollection(): Promise<Collection<User>> {
  const { db } = await connectToDatabase();
  return db.collection<User>(USERS_COLLECTION);
}


export async function fetchStudentProfilesForMarksEntry(
  semester: number, 
  section: string,
  subjectCode: string,
  facultyId: string 
): Promise<Array<{ profile: StudentProfile; marks?: SubjectMark }>> {
  try {
    console.log(`[MarksAction FetchProfiles] Faculty ${facultyId} - SEM: ${semester}, SEC: ${section}, SUB: ${subjectCode}`);
    const studentProfilesCollection = await getStudentProfilesCollection();
    const marksCollection = await getMarksCollection();
    const usersCollection = await getUsersCollection();

    const activeStudentUsers = await usersCollection.find({ role: 'Student', status: 'Active' }).project({ id: 1 }).toArray();
    const activeStudentUserIds = activeStudentUsers
        .map(u => String(u.id || '').trim()) 
        .filter(id => id); 

    if (activeStudentUserIds.length === 0) {
        console.log("[MarksAction FetchProfiles] No 'Active' student user accounts found in the system. Returning empty list.");
        return [];
    }
    
    const studentProfileQuery: Filter<StudentProfile> = {
        currentSemester: semester, 
        section,
        userId: { $in: activeStudentUserIds }
    };
    
    const studentProfilesCursor = studentProfilesCollection.find(studentProfileQuery);
    const studentProfilesArray = await studentProfilesCursor.toArray();

    if (studentProfilesArray.length === 0) {
      console.log(`[MarksAction FetchProfiles] No active student profiles found for currentSemester ${semester}, Section ${section} using the ${activeStudentUserIds.length} active user IDs. Verify student profiles have correct currentSemester, section, and an active user account. Returning empty list.`);
      return [];
    }
    
    const studentProfiles = studentProfilesArray.map(p => {
        const { _id, ...rest } = p;
        return { ...rest, id: _id.toHexString(), _id: _id.toHexString(), userId: String(p.userId || '').trim() } as StudentProfile;
    });

    const studentUserIdsFromProfiles = studentProfiles
        .map(p => p.userId)
        .filter(id => id); 

    if (studentUserIdsFromProfiles.length === 0) {
        return studentProfiles.map(profile => ({ profile, marks: undefined }));
    }
    
    const marksQuery: Filter<SubjectMark> = {
      studentId: { $in: studentUserIdsFromProfiles }, 
      semester: semester, 
      subjectCode: subjectCode,
    };
    const existingMarksArray = await marksCollection.find(marksQuery).toArray();
    
    const marksMap = new Map<string, SubjectMark>();
    existingMarksArray.forEach(markDoc => {
      const markWithStrId = { ...markDoc, _id: String(markDoc._id), id: String(markDoc._id) } as SubjectMark;
      const keyForMap = String(markDoc.studentId || '').trim(); 
      if (keyForMap) {
        marksMap.set(keyForMap, markWithStrId);
      }
    });

    const result = studentProfiles.map(profile => {
      const keyForLookup = String(profile.userId || '').trim(); 
      const foundMarks = marksMap.get(keyForLookup);
      return {
        profile: profile,
        marks: foundMarks, 
      };
    });
    return result;
  } catch (error) {
    console.error("[MarksAction FetchProfiles] Error in fetchStudentProfilesForMarksEntry:", error);
    throw new Error("Failed to fetch student profiles or marks.");
  }
}

const SubjectMarkInputSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  usn: z.string().min(1, "USN is required"),
  studentName: z.string().min(1, "Student Name is required"),
  subjectCode: z.string().min(1, "Subject Code is required"),
  subjectName: z.string().min(1, "Subject Name is required"),
  semester: z.number().int().min(1).max(8),
  ia1_50: z.number().min(0).max(50).nullable().optional(),
  ia2_50: z.number().min(0).max(50).nullable().optional(),
  assignment1_20: z.number().min(0).max(20).nullable().optional(),
  assignment2_20: z.number().min(0).max(20).nullable().optional(),
});
type SubjectMarkInput = z.infer<typeof SubjectMarkInputSchema>;

export async function saveMultipleStudentMarksAction(
  marksEntries: SubjectMarkInput[],
  facultyId: string
): Promise<{ success: boolean; message: string; errors?: any[] }> {
  try {
    if (!marksEntries || marksEntries.length === 0) {
      return { success: false, message: "No marks data provided." };
    }

    const marksCollection = await getMarksCollection();
    const studentProfilesCollection = await getStudentProfilesCollection();
    const usersCollection = await getUsersCollection();
    const operations: any[] = [];
    const validationErrors: any[] = [];

    for (const entry of marksEntries) {
      const validation = SubjectMarkInputSchema.safeParse(entry);
      if (!validation.success) {
        validationErrors.push({ usn: entry.usn || 'Unknown USN', errors: validation.error.flatten() });
        continue;
      }

      const validEntry = validation.data;
      let studentUserIdToUse = String(validEntry.studentId || '').trim();

      if (studentUserIdToUse.startsWith('temp-')) {
        const studentProfile = await studentProfilesCollection.findOne({ admissionId: validEntry.usn.toUpperCase() });
        if (studentProfile && studentProfile.userId) {
           const studentUser = await usersCollection.findOne({ id: String(studentProfile.userId).trim(), status: 'Active' });
           if(studentUser){
            studentUserIdToUse = String(studentProfile.userId).trim();
           } else {
             validationErrors.push({ usn: validEntry.usn, errors: { general: "Student with this USN is not active or does not exist." } });
             continue;
           }
        } else {
          validationErrors.push({ usn: validEntry.usn, errors: { general: "No active student found with this USN." } });
          continue;
        }
      } else {
         const studentUser = await usersCollection.findOne({ id: studentUserIdToUse, status: 'Active' });
         if (!studentUser) {
            validationErrors.push({ usn: validEntry.usn, errors: { general: "Student is not active or does not exist." } });
            continue;
         }
      }

      const markId = `${studentUserIdToUse}-${validEntry.subjectCode}-${validEntry.semester}`;

      const markDocument: SubjectMark = {
        id: markId, 
        _id: markId, 
        studentId: studentUserIdToUse, 
        usn: validEntry.usn.toUpperCase(),
        studentName: validEntry.studentName,
        subjectCode: validEntry.subjectCode,
        subjectName: validEntry.subjectName,
        semester: validEntry.semester,
        ia1_50: validEntry.ia1_50 ?? null,
        ia2_50: validEntry.ia2_50 ?? null,
        assignment1_20: validEntry.assignment1_20 ?? null,
        assignment2_20: validEntry.assignment2_20 ?? null,
      };

      operations.push({
        updateOne: {
          filter: { _id: markId }, 
          update: { $set: markDocument },
          upsert: true,
        },
      });
    }

    if (operations.length === 0 && validationErrors.length > 0) {
      return { success: false, message: "All mark entries were invalid. No data saved.", errors: validationErrors };
    }
    if (operations.length === 0 && validationErrors.length === 0){
        return { success: true, message: "No valid marks entries to save." };
    }

    const result = await marksCollection.bulkWrite(operations);
    const successCount = result.upsertedCount + result.modifiedCount;
    
    let message = `Successfully saved/updated ${successCount} of ${operations.length} student marks records.`;
    if (validationErrors.length > 0) {
        message += ` ${validationErrors.length} entries had validation issues and were skipped.`;
    }

    return {
      success: true,
      message: message,
      errors: validationErrors.length > 0 ? validationErrors : undefined,
    };

  } catch (error: any) {
    console.error("[MarksAction SaveMarks] Error in saveMultipleStudentMarksAction:", error);
    return {
      success: false,
      message: `An unexpected error occurred: ${error.message}`,
      errors: [{ general: error.message }],
    };
  }
}

export async function fetchMarksFromStorage(semester: number, section: string, subjectCode: string): Promise<SubjectMark[]> {
  const marksCollection = await getMarksCollection();
  const studentProfilesCollection = await getStudentProfilesCollection();
  const usersCollection = await getUsersCollection();

  const activeStudentUsers = await usersCollection.find({ role: 'Student', status: 'Active' }).project({ id: 1 }).toArray();
  const activeStudentUserIds = activeStudentUsers
      .map(u => String(u.id || '').trim())
      .filter(id => id);

  if (activeStudentUserIds.length === 0) return [];

  const studentProfileQuery: Filter<StudentProfile> = {
    currentSemester: semester, 
    section,
    userId: { $in: activeStudentUserIds }
  };
  const studentProfilesCursor = studentProfilesCollection.find(studentProfileQuery);
  const studentProfilesArray = await studentProfilesCursor.toArray();

  if (studentProfilesArray.length === 0) return [];

  const studentUserIdsFromProfiles = studentProfilesArray
      .map(p => String(p.userId || '').trim())
      .filter(id => id);

  if (studentUserIdsFromProfiles.length === 0) return [];
  
  const marksQuery: Filter<SubjectMark> = {
    studentId: { $in: studentUserIdsFromProfiles }, 
    semester: semester, 
    subjectCode: subjectCode,
  };

  const fetchedMarks = await marksCollection.find(marksQuery).toArray();

  return fetchedMarks.map(doc => {
    const { _id, ...rest } = doc;
    const idStr = String(_id);
    return { ...rest, id: idStr, _id: idStr, studentId: String(doc.studentId || '').trim() } as SubjectMark;
  });
}


export async function fetchAllMarksForClassAction(
  semester: number,
  section: string,
  department: string // Department is now required
): Promise<StudentClassPerformanceDetails[]> {
  try {
    const filters: { year?: number; section?: string; department?: string } = {
      year: Math.ceil(semester / 2),
      section,
      department, // Pass department to fetchStudentsForFacultyAction
    };

    const studentsInClass = await fetchStudentsForFacultyAction('', filters); 
    
    if (studentsInClass.length === 0) {
      return [];
    }

    const studentUserIds = studentsInClass.map(s => s.userId);
    // Fetch subjects dynamically based on department and semester
    const subjectsForSemester: Subject[] = await fetchSubjectsByDepartmentAndSemesterAction(department, semester);
    
    if (subjectsForSemester.length === 0) {
      console.log(`No subjects defined for Department: ${department}, Semester: ${semester}. Cannot fetch marks.`);
      return []; // Or handle as appropriate if no subjects are defined
    }
    const subjectCodes = subjectsForSemester.map(s => s.subjectCode);

    const marksCollection = await getMarksCollection();
    const marksQuery: Filter<SubjectMark> = {
      studentId: { $in: studentUserIds },
      semester: semester,
      subjectCode: { $in: subjectCodes },
    };
    const allMarksForClass = await marksCollection.find(marksQuery).toArray();

    const results: StudentClassPerformanceDetails[] = studentsInClass.map(studentProfile => {
      const marksBySubject: Record<string, SubjectMark | undefined> = {};
      subjectsForSemester.forEach(subject => {
        const mark = allMarksForClass.find(m => m.studentId === studentProfile.userId && m.subjectCode === subject.subjectCode);
        marksBySubject[subject.subjectCode] = mark ? { ...mark, _id: String(mark._id), id: String(mark._id) } : undefined;
      });
      return {
        profile: studentProfile,
        marksBySubject,
      };
    });
    return results;

  } catch (error) {
    console.error('Error in fetchAllMarksForClassAction:', error);
    throw new Error('Failed to fetch class marks data.');
  }
}
