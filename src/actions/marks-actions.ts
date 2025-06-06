
'use server';

import { z } from 'zod';
import type { SubjectMark, StudentProfile, User, StudentClassPerformanceDetails } from '@/types'; // Added User
import { connectToDatabase } from '@/lib/mongodb';
import { MARKS_COLLECTION, STUDENT_PROFILES_COLLECTION, USERS_COLLECTION } from '@/lib/constants'; // Added USERS_COLLECTION
import type { Collection, Filter } from 'mongodb';
import { ObjectId } from 'mongodb';
import { fetchStudentsForFacultyAction } from './profile-actions'; // For fetching students
import { ALL_SUBJECTS_BY_SEMESTER } from '@/lib/subjects'; // Assuming subjects are defined here


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


/**
 * Fetches student profiles for a given class (semester, section) and their existing marks for a subject.
 * Only fetches students whose user status is 'Active' and match the currentSemester.
 * @param semester The semester number.
 * @param section The section identifier.
 * @param subjectCode The code of the subject for which marks are being entered/viewed.
 * @param facultyId The ID of the faculty member (for authorization or logging).
 * @returns An array of objects, each containing a student's profile and their marks (if any) for the subject.
 */
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

    // 1. Fetch 'Active' student user IDs
    const activeStudentUsers = await usersCollection.find({ role: 'Student', status: 'Active' }).project({ id: 1 }).toArray();
    const activeStudentUserIds = activeStudentUsers
        .map(u => String(u.id || '').trim()) 
        .filter(id => id); 

    if (activeStudentUserIds.length === 0) {
        console.log("[MarksAction FetchProfiles] No 'Active' student user accounts found in the system. Returning empty list.");
        return [];
    }
    console.log(`[MarksAction FetchProfiles] Found ${activeStudentUserIds.length} 'Active' student user IDs:`, activeStudentUserIds.length < 10 ? activeStudentUserIds : `Count: ${activeStudentUserIds.length}`);

    // 2. Fetch student profiles matching currentSemester, section, and active user IDs
    const studentProfileQuery: Filter<StudentProfile> = {
        currentSemester: semester, 
        section,
        userId: { $in: activeStudentUserIds }
    };
    console.log(`[MarksAction FetchProfiles] Querying student_profiles with filter:`, JSON.stringify(studentProfileQuery));
    const studentProfilesCursor = studentProfilesCollection.find(studentProfileQuery);
    const studentProfilesArray = await studentProfilesCursor.toArray();

    if (studentProfilesArray.length === 0) {
      console.log(`[MarksAction FetchProfiles] No active student profiles found for currentSemester ${semester}, Section ${section} using the ${activeStudentUserIds.length} active user IDs. Verify student profiles have correct currentSemester, section, and an active user account. Returning empty list.`);
      return [];
    }
    console.log(`[MarksAction FetchProfiles] Found ${studentProfilesArray.length} student profiles for the class:`, studentProfilesArray.map(p => ({ name: p.fullName, userId: p.userId, admissionId: p.admissionId, db_id: p._id.toHexString(), currentSemester: p.currentSemester })));

    const studentProfiles = studentProfilesArray.map(p => {
        const { _id, ...rest } = p;
        return { ...rest, id: _id.toHexString(), _id: _id.toHexString(), userId: String(p.userId || '').trim() } as StudentProfile;
    });

    const studentUserIdsFromProfiles = studentProfiles
        .map(p => p.userId)
        .filter(id => id); 

    if (studentUserIdsFromProfiles.length === 0) {
        console.log(`[MarksAction FetchProfiles] No valid studentUserIds obtained from profiles for marks query (this should not happen if profiles were found). Returning profiles without marks.`);
        return studentProfiles.map(profile => ({ profile, marks: undefined }));
    }
    
    console.log(`[MarksAction FetchProfiles] Querying marks for studentUserIds from profiles:`, studentUserIdsFromProfiles, `Semester (for marks record): ${semester}, SubjectCode: ${subjectCode}`);

    // 3. Fetch marks for these specific students for the selected semester and subject
    const marksQuery: Filter<SubjectMark> = {
      studentId: { $in: studentUserIdsFromProfiles }, 
      semester: semester, 
      subjectCode: subjectCode,
    };
    const existingMarksArray = await marksCollection.find(marksQuery).toArray();
    console.log(`[MarksAction FetchProfiles] Fetched ${existingMarksArray.length} existing marks records for these students:`, existingMarksArray.map(m => ({studentId: m.studentId, subject: m.subjectCode, ia1: m.ia1_50, db_id: String(m._id), marks_semester: m.semester })));

    // 4. Map marks to profiles
    const marksMap = new Map<string, SubjectMark>();
    existingMarksArray.forEach(markDoc => {
      const markWithStrId = { ...markDoc, _id: String(markDoc._id), id: String(markDoc._id) } as SubjectMark;
      const keyForMap = String(markDoc.studentId || '').trim(); 
      if (keyForMap) {
        marksMap.set(keyForMap, markWithStrId);
        console.log(`[MarksAction FetchProfiles] Populating marksMap: key='${keyForMap}' (Type: ${typeof keyForMap}), subject='${markDoc.subjectCode}', ia1='${markDoc.ia1_50}', marks_semester='${markDoc.semester}'`);
      } else {
        console.warn(`[MarksAction FetchProfiles] Mark record skipped for map due to empty/invalid studentId: ${JSON.stringify(markDoc)}`);
      }
    });
    console.log(`[MarksAction FetchProfiles] Marks map created. Size: ${marksMap.size}. Keys:`, Array.from(marksMap.keys()));

    const result = studentProfiles.map(profile => {
      const keyForLookup = String(profile.userId || '').trim(); 
      const foundMarks = marksMap.get(keyForLookup);

      if (foundMarks) {
          if (foundMarks.semester !== semester) {
             console.warn(`[MarksAction FetchProfiles] Mismatched semester for student ${profile.admissionId}. Profile currentSemester (faculty selected): ${semester}, Found Mark semester: ${foundMarks.semester}. This should not happen if marksQuery is correct. Mark ignored.`);
             return { profile, marks: undefined};
          }
          console.log(`[MarksAction FetchProfiles] Successfully mapped marks for student profile.userId: '${keyForLookup}' (Type: ${typeof keyForLookup}), USN: ${profile.admissionId}, Name: ${profile.fullName}. Mark object:`, JSON.stringify(foundMarks));
      } else {
          console.log(`[MarksAction FetchProfiles] DID NOT map marks for student profile.userId: '${keyForLookup}' (Type: ${typeof keyForLookup}), USN: ${profile.admissionId}, Name: ${profile.fullName}. Checking if marks existed in raw fetch...`);
          const markForThisStudentExistsInRawFetch = existingMarksArray.find(m => String(m.studentId || '').trim() === keyForLookup && m.semester === semester);
          if (markForThisStudentExistsInRawFetch) {
              console.log(`[MarksAction FetchProfiles] ---> YES, marks for '${keyForLookup}' (USN: ${profile.admissionId}, semester ${semester}) *WERE* in existingMarksArray. Raw markDoc.studentId was: '${String(markForThisStudentExistsInRawFetch.studentId || '').trim()}' (Type: ${typeof String(markForThisStudentExistsInRawFetch.studentId || '').trim()}). Map key for this mark was: '${String(markForThisStudentExistsInRawFetch.studentId || '').trim()}' (Type: ${typeof String(markForThisStudentExistsInRawFetch.studentId || '').trim()})`);
          } else {
              console.log(`[MarksAction FetchProfiles] ---> NO, marks for '${keyForLookup}' (USN: ${profile.admissionId}, semester ${semester}) were *NOT* in existingMarksArray. Expected if no marks entered for this student/subject/semester combination.`);
          }
      }
      return {
        profile: profile,
        marks: foundMarks, 
      };
    });
    console.log(`[MarksAction FetchProfiles] Final result prepared with ${result.length} entries.`);
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
    console.log(`[MarksAction SaveMarks] Faculty ${facultyId} - Saving ${marksEntries.length} entries.`);

    const marksCollection = await getMarksCollection();
    const studentProfilesCollection = await getStudentProfilesCollection();
    const usersCollection = await getUsersCollection();
    const operations: any[] = [];
    const validationErrors: any[] = [];

    for (const entry of marksEntries) {
      const validation = SubjectMarkInputSchema.safeParse(entry);
      if (!validation.success) {
        console.warn("[MarksAction SaveMarks] Invalid mark entry skipped:", entry, validation.error.flatten());
        validationErrors.push({ usn: entry.usn || 'Unknown USN', errors: validation.error.flatten() });
        continue;
      }

      const validEntry = validation.data;
      let studentUserIdToUse = String(validEntry.studentId || '').trim();

      if (studentUserIdToUse.startsWith('temp-')) {
        console.log(`[MarksAction SaveMarks] Attempting to resolve temporary ID for USN: ${validEntry.usn}`);
        const studentProfile = await studentProfilesCollection.findOne({ admissionId: validEntry.usn.toUpperCase() });
        if (studentProfile && studentProfile.userId) {
           const studentUser = await usersCollection.findOne({ id: String(studentProfile.userId).trim(), status: 'Active' });
           if(studentUser){
            studentUserIdToUse = String(studentProfile.userId).trim();
            console.log(`[MarksAction SaveMarks] Resolved temp ID for USN ${validEntry.usn} to UserID ${studentUserIdToUse}`);
           } else {
             console.warn(`[MarksAction SaveMarks] Student profile found for USN ${validEntry.usn}, but user ${studentProfile.userId} is not active or not found. Skipping.`);
             validationErrors.push({ usn: validEntry.usn, errors: { general: "Student with this USN is not active or does not exist." } });
             continue;
           }
        } else {
          console.warn(`[MarksAction SaveMarks] No active student profile found for USN ${validEntry.usn} from temp row. Skipping.`);
          validationErrors.push({ usn: validEntry.usn, errors: { general: "No active student found with this USN." } });
          continue;
        }
      } else {
         const studentUser = await usersCollection.findOne({ id: studentUserIdToUse, status: 'Active' });
         if (!studentUser) {
            console.warn(`[MarksAction SaveMarks] User ${studentUserIdToUse} (USN: ${validEntry.usn}) is no longer active or not found. Skipping marks save.`);
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
    console.log(`[MarksAction SaveMarks] Bulk write result: Upserted ${result.upsertedCount}, Modified ${result.modifiedCount}, Matched ${result.matchedCount}`);

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
  console.log(`[MarksAction PA] Fetching marks from DB for Perf Analysis: Sem ${semester}, Sec ${section}, Sub ${subjectCode}`);
  const marksCollection = await getMarksCollection();
  const studentProfilesCollection = await getStudentProfilesCollection();
  const usersCollection = await getUsersCollection();

  const activeStudentUsers = await usersCollection.find({ role: 'Student', status: 'Active' }).project({ id: 1 }).toArray();
  const activeStudentUserIds = activeStudentUsers
      .map(u => String(u.id || '').trim())
      .filter(id => id);

  if (activeStudentUserIds.length === 0) {
    console.log("[MarksAction PA] No 'Active' student user accounts found. Returning empty marks array.");
    return [];
  }
  console.log(`[MarksAction PA] Found ${activeStudentUserIds.length} 'Active' student user IDs:`, activeStudentUserIds.length < 10 ? activeStudentUserIds : `Count: ${activeStudentUserIds.length}`);

  const studentProfileQuery: Filter<StudentProfile> = {
    currentSemester: semester, 
    section,
    userId: { $in: activeStudentUserIds }
  };
  console.log(`[MarksAction PA] Querying student_profiles with filter:`, JSON.stringify(studentProfileQuery));
  const studentProfilesCursor = studentProfilesCollection.find(studentProfileQuery);
  const studentProfilesArray = await studentProfilesCursor.toArray();

  if (studentProfilesArray.length === 0) {
    console.log(`[MarksAction PA] No active student profiles found for currentSemester ${semester}, Sec ${section} matching active users for performance analysis. Returning empty marks array.`);
    return [];
  }
  console.log(`[MarksAction PA] Found ${studentProfilesArray.length} student profiles for the class:`, studentProfilesArray.map(p => ({ name: p.fullName, userId: p.userId, admissionId: p.admissionId, currentSemester: p.currentSemester })));

  const studentUserIdsFromProfiles = studentProfilesArray
      .map(p => String(p.userId || '').trim())
      .filter(id => id);

  if (studentUserIdsFromProfiles.length === 0) {
      console.log(`[MarksAction PA] No valid studentUserIds obtained from profiles for marks query. Returning empty marks array.`);
      return [];
  }
  
  console.log(`[MarksAction PA] Querying marks for studentUserIds from profiles:`, studentUserIdsFromProfiles, `Semester (for marks record): ${semester}, SubjectCode: ${subjectCode}`);

  const marksQuery: Filter<SubjectMark> = {
    studentId: { $in: studentUserIdsFromProfiles }, 
    semester: semester, 
    subjectCode: subjectCode,
  };

  const fetchedMarks = await marksCollection.find(marksQuery).toArray();
  console.log(`[MarksAction PA] Fetched ${fetchedMarks.length} marks records:`, fetchedMarks.map(m => ({ studentId: m.studentId, subject: m.subjectCode, ia1: m.ia1_50, db_id: String(m._id), marks_semester: m.semester })));

  return fetchedMarks.map(doc => {
    const { _id, ...rest } = doc;
    const idStr = String(_id);
    return { ...rest, id: idStr, _id: idStr, studentId: String(doc.studentId || '').trim() } as SubjectMark;
  });
}


export async function fetchAllMarksForClassAction(
  semester: number,
  section: string,
  // department?: string // Department filter can be added later if needed for student profiles
): Promise<StudentClassPerformanceDetails[]> {
  try {
    const studentsInClass = await fetchStudentsForFacultyAction('', { year: Math.ceil(semester / 2), section });
    if (studentsInClass.length === 0) {
      return [];
    }

    const studentUserIds = studentsInClass.map(s => s.userId);
    const subjectsForSemester = ALL_SUBJECTS_BY_SEMESTER[String(semester)] || [];
    const subjectCodes = subjectsForSemester.map(s => s.code);

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
        const mark = allMarksForClass.find(m => m.studentId === studentProfile.userId && m.subjectCode === subject.code);
        marksBySubject[subject.code] = mark ? { ...mark, _id: String(mark._id), id: String(mark._id) } : undefined;
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
