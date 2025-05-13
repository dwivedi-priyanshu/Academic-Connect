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
    console.log(`Fetching student profiles and marks for Sem: ${semester}, Sec: ${section}, Sub: ${subjectCode}, Faculty: ${facultyId}`);
    const studentProfilesCollection = await getStudentProfilesCollection();
    const marksCollection = await getMarksCollection();
    const usersCollection = await getUsersCollection();

    const year = Math.ceil(semester / 2);

    // 1. Get User.ids of active students
    // Assuming User documents have a string 'id' field which is the hex string of _id.
    // If 'id' field doesn't exist, project _id and map it.
    // Based on auth-actions, user documents should have an 'id' field.
    const activeStudentUsers = await usersCollection.find({ role: 'Student', status: 'Active' }).project({ id: 1 }).toArray();
    const activeStudentUserIds = activeStudentUsers.map(u => u.id).filter(id => !!id); // Ensure no undefined/null ids

    if (activeStudentUserIds.length === 0) {
        console.log("No active students found in the system.");
        return [];
    }
    
    // Fetch active student profiles for the given year and section
    const studentProfilesCursor = studentProfilesCollection.find({
        year,
        section,
        userId: { $in: activeStudentUserIds } // Filter profiles by active student User.ids
    });
    const studentProfiles = (await studentProfilesCursor.toArray()).map(p => {
        const { _id, ...rest } = p;
        // Ensure userId from DB (p.userId) is carried through. It should be a string.
        return { ...rest, id: _id.toHexString(), _id: _id.toHexString(), userId: p.userId } as StudentProfile;
    });

    if (studentProfiles.length === 0) {
      console.log(`No active student profiles found for Sem ${semester}, Sec ${section} matching active users.`);
      return [];
    }

    const studentUserIdsForMarksQuery = studentProfiles.map(p => p.userId); // Use User.id (string) from the filtered profiles

    const marksQuery: Filter<SubjectMark> = {
      studentId: { $in: studentUserIdsForMarksQuery }, // Query by User.id
      semester: semester,
      subjectCode: subjectCode,
    };
    const existingMarksCursor = marksCollection.find(marksQuery);
    const existingMarksArray = await existingMarksCursor.toArray();

    const marksMap = new Map<string, SubjectMark>();
    existingMarksArray.forEach(markDoc => {
      // markDoc._id is composite key string, markDoc.studentId is User.id string
      const markWithStrId = { ...markDoc, _id: String(markDoc._id), id: String(markDoc._id) } as SubjectMark;
      marksMap.set(markDoc.studentId, markWithStrId); // Key by studentId (User.id)
    });

    const result = studentProfiles.map(profile => {
      return {
        profile: profile, // profile already has string IDs and correct userId
        marks: marksMap.get(profile.userId), // Get marks using User.id
      };
    });

    return result;
  } catch (error) {
    console.error("Error in fetchStudentProfilesForMarksEntry:", error);
    throw new Error("Failed to fetch student profiles or marks.");
  }
}

// Schema for validating individual mark entries before saving
const SubjectMarkInputSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"), // This is User.id
  usn: z.string().min(1, "USN is required"),
  studentName: z.string().min(1, "Student Name is required"),
  subjectCode: z.string().min(1, "Subject Code is required"),
  subjectName: z.string().min(1, "Subject Name is required"),
  semester: z.number().int().min(1).max(8),
  ia1_50: z.number().min(0).max(50).nullable().optional(),
  ia2_50: z.number().min(0).max(50).nullable().optional(),
  assignment1_20: z.number().min(0).max(20).nullable().optional(),
  assignment2_20: z.number().min(0).max(20).nullable().optional(),
  // final_marks_50 field removed as it was not in original schema and auto-calculation is complex for generic save
});
type SubjectMarkInput = z.infer<typeof SubjectMarkInputSchema>;

/**
 * Saves or updates marks for multiple students.
 * @param marksEntries An array of SubjectMarkInput objects.
 * @param facultyId The ID of the faculty member performing the save (for logging/auditing).
 * @returns An object indicating success, a message, and optional errors.
 */
export async function saveMultipleStudentMarksAction(
  marksEntries: SubjectMarkInput[],
  facultyId: string
): Promise<{ success: boolean; message: string; errors?: any[] }> {
  try {
    if (!marksEntries || marksEntries.length === 0) {
      return { success: false, message: "No marks data provided." };
    }
    console.log(`Saving ${marksEntries.length} student marks entries by Faculty: ${facultyId}`);

    const marksCollection = await getMarksCollection();
    const operations: any[] = []; 
    const validationErrors: any[] = [];

    for (const entry of marksEntries) {
      const validation = SubjectMarkInputSchema.safeParse(entry);
      if (!validation.success) {
        console.warn("Invalid mark entry skipped:", entry, validation.error.flatten());
        validationErrors.push({ usn: entry.usn || 'Unknown USN', errors: validation.error.flatten() });
        continue;
      }

      const validEntry = validation.data;
      // Ensure studentId is a valid user ID string.
      // The studentId field in SubjectMarkInput is expected to be the User.id (string).
      const markId = `${validEntry.studentId}-${validEntry.subjectCode}-${validEntry.semester}`;

      const markDocument: SubjectMark = {
        id: markId,
        _id: markId, 
        studentId: validEntry.studentId,
        usn: validEntry.usn,
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
    console.log(`Bulk write result: Upserted ${result.upsertedCount}, Modified ${result.modifiedCount}, Matched ${result.matchedCount}`);

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
    console.error("Error in saveMultipleStudentMarksAction:", error);
    return {
      success: false,
      message: `An unexpected error occurred: ${error.message}`,
      errors: [{ general: error.message }],
    };
  }
}


/**
 * Fetches all marks for a given subject in a specific semester and section.
 * This function is primarily used for the performance analysis page.
 * It relies on student profiles to identify students in a section.
 * @param semester The semester number.
 * @param section The section identifier.
 * @param subjectCode The code of the subject.
 * @returns An array of SubjectMark objects.
 */
export async function fetchMarksFromStorage(semester: number, section: string, subjectCode: string): Promise<SubjectMark[]> {
  console.log(`Fetching marks from DB for Performance Analysis: Sem ${semester}, Sec ${section}, Sub ${subjectCode}`);
  const marksCollection = await getMarksCollection();
  const studentProfilesCollection = await getStudentProfilesCollection();
  const usersCollection = await getUsersCollection(); // Added for filtering by active users

  const year = Math.ceil(semester / 2);

  // 1. Find active student User.ids
  const activeStudentUsers = await usersCollection.find({ role: 'Student', status: 'Active' }).project({ id: 1 }).toArray();
  const activeStudentUserIds = activeStudentUsers.map(u => u.id).filter(id => !!id);

  if (activeStudentUserIds.length === 0) {
    console.log("No active students found in the system for performance analysis.");
    return [];
  }

  // 2. Find student profiles for the given year and section, among active students
  const studentProfilesCursor = studentProfilesCollection.find({ 
    year, 
    section,
    userId: { $in: activeStudentUserIds }
  });
  const studentProfiles = await studentProfilesCursor.toArray();

  if (studentProfiles.length === 0) {
    console.log(`No active student profiles found for Sem ${semester}, Sec ${section}. Returning empty marks array.`);
    return [];
  }

  const studentUserIdsForMarksQuery = studentProfiles.map(p => p.userId); 

  // 3. Fetch marks for these students for the given subject and semester
  const marksQuery: Filter<SubjectMark> = {
    studentId: { $in: studentUserIdsForMarksQuery }, 
    semester: semester,
    subjectCode: subjectCode,
  };

  const fetchedMarks = await marksCollection.find(marksQuery).toArray();

  return fetchedMarks.map(doc => {
    const { _id, ...rest } = doc;
    return { ...rest, id: String(doc._id), _id: String(doc._id) } as SubjectMark;
  });
}

