
'use server';

import * as XLSX from 'xlsx';
import { z } from 'zod';
import type { SubjectMark, StudentProfile } from '@/types';
import { connectToDatabase } from '@/lib/mongodb';
import { MARKS_COLLECTION, STUDENT_PROFILES_COLLECTION } from '@/lib/constants';
import type { Collection } from 'mongodb';

// Zod schema for validating row data extracted from Excel
// Ensures that marks are numbers or can be safely converted to null if not parseable as numbers.
const MarkValueSchema = z.union([z.number(), z.string(), z.null()])
  .optional()
  .transform(val => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const num = parseFloat(val);
      return isNaN(num) ? null : num;
    }
    return null; // Handles null, undefined, or other types by converting to null
  });

const MarkRowSchema = z.object({
  USN: z.string().trim().min(1, "USN cannot be empty"),
  NAME: z.string().trim().min(1, "Name cannot be empty"),
  'IAT-1(50)': MarkValueSchema,
  'IAT-2(50)': MarkValueSchema,
  'Assignment-1(20)': MarkValueSchema,
  'Assignment-2(20)': MarkValueSchema,
});


const UploadMarksInputSchema = z.object({
  fileData: z.instanceof(Uint8Array).describe('The Excel file content as Uint8Array'),
  semester: z.coerce.number().min(1).max(8),
  section: z.string().trim().min(1),
  subjectCode: z.string().trim().min(1),
  subjectName: z.string().trim().min(1),
  facultyId: z.string().trim().min(1),
});
export type UploadMarksInput = z.infer<typeof UploadMarksInputSchema>;

const UploadMarksOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  processedMarks: z.array(z.custom<SubjectMark>()).optional(),
  errorDetails: z.array(z.string()).optional(),
});
export type UploadMarksOutput = z.infer<typeof UploadMarksOutputSchema>;

async function getMarksCollection(): Promise<Collection<SubjectMark>> {
  const { db } = await connectToDatabase();
  return db.collection<SubjectMark>(MARKS_COLLECTION);
}

async function getStudentProfilesCollection(): Promise<Collection<StudentProfile>> {
  const { db } = await connectToDatabase();
  return db.collection<StudentProfile>(STUDENT_PROFILES_COLLECTION);
}

// Save marks to MongoDB
async function saveMarksToDb(marks: SubjectMark[], semester: number, section: string, subjectCode: string): Promise<void> {
  if (marks.length === 0) return;
  const marksCollection = await getMarksCollection();
  // Delete existing marks for this combination to prevent duplicates and ensure fresh data.
  await marksCollection.deleteMany({ semester, subjectCode, $comment: `Faculty is uploading for section ${section}` });
  // Note: 'section' is not part of the delete query if not stored on SubjectMark.
  // If SubjectMark needs to be section-specific for deletion, it must include 'section'.
  // Currently, context is section ${section} but not used in deleteMany query directly.

  // Prepare marks for DB: use composite key as _id
  const marksToInsert = marks.map(mark => ({ ...mark, _id: mark.id }));
  await marksCollection.insertMany(marksToInsert as any[]);
  console.log(`Saved ${marks.length} marks to DB for Sem: ${semester}, Sec: ${section}, Sub: ${subjectCode}`);
}

// Fetch marks from MongoDB
export async function fetchMarksFromStorage(semester: number, section: string, subjectCode: string): Promise<SubjectMark[]> {
  console.log(`Fetching marks from DB for Sem: ${semester}, Sec: ${section}, Sub: ${subjectCode}`);
  const marksCollection = await getMarksCollection();
  // The query assumes that the combination of semester and subjectCode is sufficient
  // to retrieve marks for a faculty's specific class (which includes a section).
  // If marks need to be strictly isolated by section in the DB (e.g. if multiple faculty teach same subject in same sem but different sections)
  // then 'section' should be part of the SubjectMark document and query.
  const fetchedMarks = await marksCollection.find({ semester, subjectCode }).toArray();
  // Map _id back to id
  return fetchedMarks.map(doc => {
    const { _id, ...rest } = doc as any; 
    return { ...rest, id: _id } as SubjectMark; 
  });
}

export async function uploadMarks(input: UploadMarksInput): Promise<UploadMarksOutput> {
  try {
    const validation = UploadMarksInputSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, message: "Invalid input data.", errorDetails: validation.error.flatten().fieldErrors as any };
    }

    const { fileData, semester, section, subjectCode, subjectName, facultyId } = validation.data;
    console.log(`Processing marks upload for Sem: ${semester}, Sec: ${section}, Sub: ${subjectCode} by Faculty: ${facultyId}`);

    const workbook = XLSX.read(fileData, { type: 'array' });
    const sheetName = workbook.SheetNames[0]; // Assuming data is in the first sheet
    const worksheet = workbook.Sheets[sheetName];
    // Convert sheet to JSON. `raw: true` keeps original values, `defval: null` for empty cells.
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { raw: true, defval: null });

    const processedMarks: SubjectMark[] = [];
    const errorDetails: string[] = [];
    const studentProfilesCollection = await getStudentProfilesCollection();

    for (const [index, row] of jsonData.entries()) {
        // Skip empty rows or rows without a USN
        if (!row || !row.USN || String(row.USN).trim() === "") {
            console.log(`Skipping empty or invalid row ${index + 2}`);
            continue;
        }
        
        const normalizedRow: any = {};
        // Normalize keys to uppercase to handle variations in Excel column headers
        for (const key in row) {
            normalizedRow[key.trim().toUpperCase()] = row[key];
        }

        // Map normalized keys to the keys expected by MarkRowSchema
        const mappedRow = {
            USN: normalizedRow['USN'],
            NAME: normalizedRow['NAME'],
            'IAT-1(50)': normalizedRow['IAT-1(50)'],
            'IAT-2(50)': normalizedRow['IAT-2(50)'],
            'Assignment-1(20)': normalizedRow['ASSIGNMENT-1(20)'] || normalizedRow['ASSIGNMENT 1 (20)'], // Handle variations
            'Assignment-2(20)': normalizedRow['ASSIGNMENT-2(20)'] || normalizedRow['ASSIGNMENT 2 (20)'], // Handle variations
        };

        const rowValidation = MarkRowSchema.safeParse(mappedRow);
        if (!rowValidation.success) {
            errorDetails.push(`Row ${index + 2}: Validation Error - ${JSON.stringify(rowValidation.error.flatten().fieldErrors)} | Raw Data: ${JSON.stringify(row)}`);
            continue;
        }

        const rowData = rowValidation.data;
        const usn = String(rowData.USN).toUpperCase();
        
        const studentProfile = await studentProfilesCollection.findOne({ admissionId: usn });

        if (!studentProfile) {
            errorDetails.push(`Row ${index + 2}: USN "${usn}" not found in student records. This student's marks will not be processed.`);
            continue;
        }
        // Ensure studentId is correctly sourced from the profile's own 'id' or '_id' field.
        // StudentProfile type should have 'id' as the primary string identifier.
        // If studentProfile._id is an ObjectId, it needs to be .toHexString(). Assuming profile.id is already string.
        const studentId = studentProfile.id || studentProfile._id?.toHexString();
        if(!studentId) {
            errorDetails.push(`Row ${index + 2}: USN "${usn}" found, but student record is missing a valid ID.`);
            continue;
        }


        const markEntry: SubjectMark = {
            id: `${studentId}-${subjectCode}-${semester}`, // Composite ID for MongoDB _id
            studentId: studentId,
            usn: usn,
            studentName: String(rowData.NAME), // Ensure name from Excel is used
            subjectCode: subjectCode,
            subjectName: subjectName,
            semester: semester,
            // rowData values are already transformed to number | null by MarkValueSchema
            ia1_50: rowData['IAT-1(50)'],
            ia2_50: rowData['IAT-2(50)'],
            assignment1_20: rowData['Assignment-1(20)'],
            assignment2_20: rowData['Assignment-2(20)'],
        };
        processedMarks.push(markEntry);
    }

    if (errorDetails.length > 0 && processedMarks.length === 0) {
        return { success: false, message: "Failed to process any marks from Excel. See error details.", errorDetails };
    }

    // Only save if there are marks to process, even if some rows had errors
    if (processedMarks.length > 0) {
        await saveMarksToDb(processedMarks, semester, section, subjectCode);
    }

    const message = errorDetails.length > 0
      ? `Processed ${processedMarks.length} mark entries with ${errorDetails.length} errors. Check details.`
      : `Successfully processed ${processedMarks.length} mark entries.`;

    return {
      success: true,
      message: message,
      processedMarks: processedMarks, // Send back successfully processed marks
      errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
    };

  } catch (error: any) {
    console.error("Error processing marks upload:", error);
    return {
      success: false,
      message: `An unexpected error occurred: ${error.message}`,
      errorDetails: [`Server error: ${error.message}`],
    };
  }
}

// Server action to save edited marks to MongoDB
export async function saveEditedMarks(marks: SubjectMark[], semester: number, section: string, subjectCode: string, facultyId: string): Promise<{ success: boolean; message: string }> {
    try {
        console.log(`Saving EDITED marks to DB for Sem: ${semester}, Sec: ${section}, Sub: ${subjectCode} by Faculty: ${facultyId}`);
        // This uses the same saveMarksToDb which clears existing marks for the subject/semester and re-inserts all.
        // This is suitable if the 'marks' array passed is the complete, edited list for that subject/semester.
        await saveMarksToDb(marks, semester, section, subjectCode);
        return { success: true, message: "Edited marks saved successfully." };
    } catch (error: any) {
        console.error("Error saving edited marks:", error);
        return { success: false, message: `Failed to save edited marks: ${error.message}` };
    }
}
