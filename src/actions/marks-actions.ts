'use server';

import { z } from 'zod';
import type { SubjectMark, StudentProfile, User } from '@/types'; // Added User
import { connectToDatabase } from '@/lib/mongodb';
import { MARKS_COLLECTION, STUDENT_PROFILES_COLLECTION, USERS_COLLECTION } from '@/lib/constants'; // Added USERS_COLLECTION
import type { Collection, Filter } from 'mongodb';
import { ObjectId } from 'mongodb';


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
 * Fetches student profiles for a given class (year, section) and their existing marks for a subject.
 * Only fetches students whose user status is 'Active'.
 * @param semester The semester number.
 * @param section The section identifier.
 * @param subjectCode The code of the subject for which marks are being entered/viewed.
 * @param facultyId The ID of the faculty member (for authorization or logging, not directly used in query yet).
 * @returns An array of objects, each containing a student's profile and their marks (if any) for the subject.
 */
export async function fetchStudentProfilesForMarksEntry(
  semester: number,
  section: string,
  subjectCode: string,
  facultyId: string
): Promise<Array<{ profile: StudentProfile; marks?: SubjectMark }>> {
  try {
    console.log(`[MarksAction] Fetching student profiles and marks for Sem: ${semester}, Sec: ${section}, Sub: ${subjectCode}, Faculty: ${facultyId}`);
    const studentProfilesCollection = await getStudentProfilesCollection();
    const marksCollection = await getMarksCollection();
    const usersCollection = await getUsersCollection();

    const year = Math.ceil(semester / 2);
    console.log(`[MarksAction] Calculated Year: ${year} for Semester: ${semester}`);

    const activeStudentUsers = await usersCollection.find({ role: 'Student', status: 'Active' }).project({ id: 1 }).toArray();
    console.log(`[MarksAction] Found ${activeStudentUsers.length} total 'Active' student users in the system.`);
    
    const activeStudentUserIds = activeStudentUsers.map(u => u.id).filter(id => !!id); 

    if (activeStudentUserIds.length === 0) {
        console.log("[MarksAction] No 'Active' student user accounts found. Returning empty list.");
        return [];
    }
    console.log("[MarksAction] Active student user IDs:", activeStudentUserIds);
    
    const studentProfilesCursor = studentProfilesCollection.find({
        year,
        section,
        userId: { $in: activeStudentUserIds } 
    });
    const studentProfilesArray = await studentProfilesCursor.toArray();
    console.log(`[MarksAction] Found ${studentProfilesArray.length} student profiles matching Year: ${year}, Section: ${section}, and Active User IDs.`);

    const studentProfiles = studentProfilesArray.map(p => {
        const { _id, ...rest } = p;
        return { ...rest, id: _id.toHexString(), _id: _id.toHexString(), userId: p.userId } as StudentProfile;
    });

    if (studentProfiles.length === 0) {
      console.log(`[MarksAction] No active student profiles found for Sem ${semester} (Year ${year}), Sec ${section} matching active users. Returning empty list.`);
      return [];
    }
    console.log(`[MarksAction] Student profiles to be processed:`, studentProfiles.map(p => ({ id: p.id, userId: p.userId, admissionId: p.admissionId, name: p.fullName })));

    const studentUserIdsForMarksQuery = studentProfiles.map(p => p.userId); 

    const marksQuery: Filter<SubjectMark> = {
      studentId: { $in: studentUserIdsForMarksQuery }, 
      semester: semester,
      subjectCode: subjectCode,
    };
    const existingMarksCursor = marksCollection.find(marksQuery);
    const existingMarksArray = await existingMarksCursor.toArray();
    console.log(`[MarksAction] Found ${existingMarksArray.length} existing marks records for these students, subject ${subjectCode}, semester ${semester}.`);

    const marksMap = new Map<string, SubjectMark>();
    existingMarksArray.forEach(markDoc => {
      const markWithStrId = { ...markDoc, _id: String(markDoc._id), id: String(markDoc._id) } as SubjectMark;
      marksMap.set(markDoc.studentId, markWithStrId); 
    });

    const result = studentProfiles.map(profile => {
      return {
        profile: profile, 
        marks: marksMap.get(profile.userId), 
      };
    });
    console.log(`[MarksAction] Final result prepared with ${result.length} entries.`);
    return result;
  } catch (error) {
    console.error("[MarksAction] Error in fetchStudentProfilesForMarksEntry:", error);
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
    console.log(`[MarksAction] Saving ${marksEntries.length} student marks entries by Faculty: ${facultyId}`);

    const marksCollection = await getMarksCollection();
    const studentProfilesCollection = await getStudentProfilesCollection();
    const usersCollection = await getUsersCollection();
    const operations: any[] = []; 
    const validationErrors: any[] = [];

    for (const entry of marksEntries) {
      const validation = SubjectMarkInputSchema.safeParse(entry);
      if (!validation.success) {
        console.warn("[MarksAction] Invalid mark entry skipped:", entry, validation.error.flatten());
        validationErrors.push({ usn: entry.usn || 'Unknown USN', errors: validation.error.flatten() });
        continue;
      }

      const validEntry = validation.data;
      let studentUserIdToUse = validEntry.studentId;

      // If studentId is temporary, try to find the actual student by USN
      if (validEntry.studentId.startsWith('temp-')) {
        console.log(`[MarksAction] Attempting to resolve temporary ID for USN: ${validEntry.usn}`);
        const studentProfile = await studentProfilesCollection.findOne({ admissionId: validEntry.usn.toUpperCase() });
        if (studentProfile && studentProfile.userId) {
           const studentUser = await usersCollection.findOne({ id: studentProfile.userId, status: 'Active' });
           if(studentUser){
            studentUserIdToUse = studentProfile.userId;
            console.log(`[MarksAction] Resolved temp ID for USN ${validEntry.usn} to UserID ${studentUserIdToUse}`);
           } else {
             console.warn(`[MarksAction] Student profile found for USN ${validEntry.usn}, but user ${studentProfile.userId} is not active or not found. Skipping.`);
             validationErrors.push({ usn: validEntry.usn, errors: { general: "Student with this USN is not active or does not exist." } });
             continue;
           }
        } else {
          console.warn(`[MarksAction] No active student profile found for USN ${validEntry.usn} from temp row. Skipping.`);
          validationErrors.push({ usn: validEntry.usn, errors: { general: "No active student found with this USN." } });
          continue;
        }
      } else {
         // Verify existing studentId still corresponds to an active student
         const studentUser = await usersCollection.findOne({ id: validEntry.studentId, status: 'Active' });
         if (!studentUser) {
            console.warn(`[MarksAction] User ${validEntry.studentId} (USN: ${validEntry.usn}) is no longer active or not found. Skipping marks save.`);
            validationErrors.push({ usn: validEntry.usn, errors: { general: "Student is not active or does not exist." } });
            continue;
         }
      }


      const markId = `${studentUserIdToUse}-${validEntry.subjectCode}-${validEntry.semester}`;

      const markDocument: SubjectMark = {
        id: markId,
        _id: markId, 
        studentId: studentUserIdToUse, // Use resolved or original valid studentId
        usn: validEntry.usn.toUpperCase(), // Store USN in uppercase
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
    console.log(`[MarksAction] Bulk write result: Upserted ${result.upsertedCount}, Modified ${result.modifiedCount}, Matched ${result.matchedCount}`);

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
    console.error("[MarksAction] Error in saveMultipleStudentMarksAction:", error);
    return {
      success: false,
      message: `An unexpected error occurred: ${error.message}`,
      errors: [{ general: error.message }],
    };
  }
}

export async function fetchMarksFromStorage(semester: number, section: string, subjectCode: string): Promise<SubjectMark[]> {
  console.log(`[MarksAction] Fetching marks from DB for Performance Analysis: Sem ${semester}, Sec ${section}, Sub ${subjectCode}`);
  const marksCollection = await getMarksCollection();
  const studentProfilesCollection = await getStudentProfilesCollection();
  const usersCollection = await getUsersCollection(); 

  const year = Math.ceil(semester / 2);

  const activeStudentUsers = await usersCollection.find({ role: 'Student', status: 'Active' }).project({ id: 1 }).toArray();
  const activeStudentUserIds = activeStudentUsers.map(u => u.id).filter(id => !!id);

  if (activeStudentUserIds.length === 0) {
    console.log("[MarksAction] No active students found in the system for performance analysis.");
    return [];
  }

  const studentProfilesCursor = studentProfilesCollection.find({ 
    year, 
    section,
    userId: { $in: activeStudentUserIds }
  });
  const studentProfiles = await studentProfilesCursor.toArray();

  if (studentProfiles.length === 0) {
    console.log(`[MarksAction] No active student profiles found for Sem ${semester}, Sec ${section} for performance analysis. Returning empty marks array.`);
    return [];
  }

  const studentUserIdsForMarksQuery = studentProfiles.map(p => p.userId); 

  const marksQuery: Filter<SubjectMark> = {
    studentId: { $in: studentUserIdsForMarksQuery }, 
    semester: semester,
    subjectCode: subjectCode,
  };

  const fetchedMarks = await marksCollection.find(marksQuery).toArray();
  console.log(`[MarksAction] Fetched ${fetchedMarks.length} marks for performance analysis.`);

  return fetchedMarks.map(doc => {
    const { _id, ...rest } = doc;
    return { ...rest, id: String(doc._id), _id: String(doc._id) } as SubjectMark;
  });
}
