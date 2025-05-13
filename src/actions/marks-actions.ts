
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


// Fetch student profiles for a given class (semester, section) and their existing marks for a subject
export async function fetchStudentProfilesForMarksEntry(
  semester: number,
  section: string,
  subjectCode: string,
  facultyId: string // for authorization or logging, not directly used in query yet
): Promise<Array<{ profile: StudentProfile; marks?: SubjectMark }>> {
  try {
    console.log(`Fetching student profiles and marks for Sem: ${semester}, Sec: ${section}, Sub: ${subjectCode}, Faculty: ${facultyId}`);
    const studentProfilesCollection = await getStudentProfilesCollection();
    const marksCollection = await getMarksCollection();

    const year = Math.ceil(semester / 2);
    // TODO: Potentially filter by department associated with facultyId or subjectCode if needed
    const studentProfilesCursor = studentProfilesCollection.find({ year, section });
    const studentProfiles = await studentProfilesCursor.toArray();

    if (studentProfiles.length === 0) {
      return [];
    }

    const studentUserIds = studentProfiles.map(p => p.userId);

    const marksQuery: Filter<SubjectMark> = {
      studentId: { $in: studentUserIds },
      semester: semester,
      subjectCode: subjectCode,
    };
    const existingMarksCursor = marksCollection.find(marksQuery);
    const existingMarksArray = await existingMarksCursor.toArray();
    
    const marksMap = new Map<string, SubjectMark>();
    existingMarksArray.forEach(mark => {
      // Ensure _id is stringified if it's an ObjectId by mistake, though it should be string "studentId-subjectCode-semester"
      const markWithStrId = { ...mark, _id: String(mark._id), id: String(mark._id) } as SubjectMark;
      marksMap.set(mark.studentId, markWithStrId);
    });

    const result = studentProfiles.map(profile => {
      const profileWithStrId = { ...profile, _id: profile._id.toHexString(), id: profile._id.toHexString() } as StudentProfile;
      return {
        profile: profileWithStrId,
        marks: marksMap.get(profile.userId),
      };
    });

    return result;
  } catch (error) {
    console.error("Error in fetchStudentProfilesForMarksEntry:", error);
    throw new Error("Failed to fetch student profiles or marks.");
  }
}

// Save/Update marks for multiple students
const SubjectMarkInputSchema = z.object({
  studentId: z.string(),
  usn: z.string(),
  studentName: z.string(),
  subjectCode: z.string(),
  subjectName: z.string(),
  semester: z.number(),
  ia1_50: z.number().nullable().optional(),
  ia2_50: z.number().nullable().optional(),
  assignment1_20: z.number().nullable().optional(),
  assignment2_20: z.number().nullable().optional(),
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
    console.log(`Saving ${marksEntries.length} student marks entries by Faculty: ${facultyId}`);

    const marksCollection = await getMarksCollection();
    const operations = marksEntries.map(entry => {
      // Validate each entry (optional, but good practice)
      const validation = SubjectMarkInputSchema.safeParse(entry);
      if (!validation.success) {
        // Handle or collect validation errors
        console.warn("Invalid mark entry skipped:", validation.error.flatten());
        return null; 
      }
      const validEntry = validation.data;
      const markId = `${validEntry.studentId}-${validEntry.subjectCode}-${validEntry.semester}`;
      
      // Prepare the document, ensuring all fields are present or explicitly null
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
      };

      return {
        updateOne: {
          filter: { _id: markId }, // Query by the composite _id
          update: { $set: markDocument },
          upsert: true,
        },
      };
    }).filter(op => op !== null);

    if (operations.length === 0) {
      return { success: true, message: "No valid marks entries to save after validation." };
    }

    // @ts-ignore
    const result = await marksCollection.bulkWrite(operations);

    const successCount = result.upsertedCount + result.modifiedCount;
    console.log(`Bulk write result: Upserted ${result.upsertedCount}, Modified ${result.modifiedCount}`);
    
    return {
      success: true,
      message: `Successfully saved/updated ${successCount} of ${marksEntries.length} student marks records.`,
    };

  } catch (error: any) {
    console.error("Error in saveMultipleStudentMarksAction:", error);
    return {
      success: false,
      message: `An unexpected error occurred: ${error.message}`,
      errors: [error.message],
    };
  }
}


// Kept for reference or potential future use if single-subject detail view is needed
export async function fetchMarksFromStorage(semester: number, section: string, subjectCode: string): Promise<SubjectMark[]> {
  console.log(`Fetching marks from DB for Sem: ${semester}, Sec: ${section}, Sub: ${subjectCode}`);
  const marksCollection = await getMarksCollection();
  // This query assumes marks are stored with section, which they are not currently.
  // Marks are per student, subject, semester. Section is an attribute of the student.
  // To fetch by section, we'd first need to find students in that section.
  // For now, this function fetches all marks for a subject in a semester.
  const fetchedMarks = await marksCollection.find({ semester, subjectCode }).toArray();
  return fetchedMarks.map(doc => {
    const { _id, ...rest } = doc as any; 
    return { ...rest, id: _id.toString(), _id: _id.toString() } as SubjectMark; // ensure _id is string
  });
}
