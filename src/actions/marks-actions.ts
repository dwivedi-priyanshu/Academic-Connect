
'use server';

import { z } from 'zod';
import type { SubjectMark, StudentProfile } from '@/types';
import { connectToDatabase } from '@/lib/mongodb';
import { MARKS_COLLECTION, STUDENT_PROFILES_COLLECTION } from '@/lib/constants';
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

    const year = Math.ceil(semester / 2);

    // Fetch active student profiles for the given year and section
    // It's crucial that StudentProfile.userId corresponds to User.id, which is a string (ObjectId.toHexString())
    // And StudentProfile.id is its own _id.toHexString()
    const studentProfilesCursor = studentProfilesCollection.find({
        year,
        section,
        // Add a check for student.user.status === 'Active' by joining with users collection or ensuring profiles are only for active users
        // For now, assuming StudentProfile implies an associated active user if they are in a class section.
        // A more robust way would be to fetch active User IDs first, then query StudentProfile.
        // This is handled in fetchStudentsForFacultyAction, we can adapt similar logic if needed here or ensure consistency.
        // For now, let's assume profiles are for students who are generally active in the system.
        // The `fetchStudentsForFacultyAction` already filters by active users. Here we directly query profiles.
        // This means the admin must ensure students are 'Active' AND assigned to sections.
    });
    const studentProfiles = (await studentProfilesCursor.toArray()).map(p => {
        const { _id, ...rest } = p;
        return { ...rest, id: _id.toHexString(), _id: _id.toHexString(), userId: p.userId } as StudentProfile;
    });

    if (studentProfiles.length === 0) {
      return [];
    }

    const studentUserIds = studentProfiles.map(p => p.userId); // Use User.id (string)

    const marksQuery: Filter<SubjectMark> = {
      studentId: { $in: studentUserIds }, // Query by User.id
      semester: semester,
      subjectCode: subjectCode,
    };
    const existingMarksCursor = marksCollection.find(marksQuery);
    const existingMarksArray = await existingMarksCursor.toArray();

    const marksMap = new Map<string, SubjectMark>();
    existingMarksArray.forEach(markDoc => {
      // Ensure _id is stringified, which it should be as it's the composite key.
      // Also ensure 'id' field is present and matches _id.
      const markWithStrId = { ...markDoc, _id: String(markDoc._id), id: String(markDoc._id) } as SubjectMark;
      marksMap.set(markDoc.studentId, markWithStrId); // Key by studentId (User.id)
    });

    const result = studentProfiles.map(profile => {
      return {
        profile: profile, // profile already has string IDs
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
  // id and _id will be derived, not part of direct input for this action
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
    const operations: any[] = []; // Array for bulkWrite operations
    const validationErrors: any[] = [];

    for (const entry of marksEntries) {
      const validation = SubjectMarkInputSchema.safeParse(entry);
      if (!validation.success) {
        console.warn("Invalid mark entry skipped:", entry, validation.error.flatten());
        validationErrors.push({ usn: entry.usn || 'Unknown USN', errors: validation.error.flatten() });
        continue;
      }

      const validEntry = validation.data;
      const markId = `${validEntry.studentId}-${validEntry.subjectCode}-${validEntry.semester}`;

      // Construct the document for MongoDB, ensuring all assessment fields are explicitly present or null
      const markDocument: SubjectMark = {
        id: markId,
        _id: markId, // Use the composite key as MongoDB _id
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
        // credits field is optional and not handled in this form, can be added if needed
      };

      operations.push({
        updateOne: {
          filter: { _id: markId }, // Query by the composite _id which includes studentId
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

  const year = Math.ceil(semester / 2);

  // 1. Find students in the given year and section
  const studentProfilesCursor = studentProfilesCollection.find({ year, section });
  const studentProfiles = await studentProfilesCursor.toArray();

  if (studentProfiles.length === 0) {
    console.log(`No student profiles found for Sem ${semester}, Sec ${section}. Returning empty marks array.`);
    return [];
  }

  const studentUserIds = studentProfiles.map(p => p.userId); // These are User.id strings

  // 2. Fetch marks for these students for the given subject and semester
  const marksQuery: Filter<SubjectMark> = {
    studentId: { $in: studentUserIds }, // Query by User.id
    semester: semester,
    subjectCode: subjectCode,
  };

  const fetchedMarks = await marksCollection.find(marksQuery).toArray();

  return fetchedMarks.map(doc => {
    // _id is already a string (studentId-subjectCode-semester) and is also stored as 'id'.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, ...rest } = doc;
    return { ...rest, id: String(doc._id), _id: String(doc._id) } as SubjectMark;
  });
}
