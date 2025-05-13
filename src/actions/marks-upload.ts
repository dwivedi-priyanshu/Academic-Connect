
'use server';

import * as XLSX from 'xlsx';
import { z } from 'zod';
import type { SubjectMark, StudentProfile } from '@/types';
import { connectToDatabase } from '@/lib/mongodb';
import { MARKS_COLLECTION, STUDENT_PROFILES_COLLECTION } from '@/lib/constants';
import type { Collection } from 'mongodb';

// Zod schema for validating row data extracted from Excel
const MarkRowSchema = z.object({
  USN: z.string().trim().min(1, "USN cannot be empty"),
  NAME: z.string().trim().min(1, "Name cannot be empty"),
  'IAT-1(50)': z.union([z.number(), z.string(), z.null()]).optional(),
  'IAT-2(50)': z.union([z.number(), z.string(), z.null()]).optional(),
  'Assignment-1(20)': z.union([z.number(), z.string(), z.null()]).optional(),
  'Assignment-2(20)': z.union([z.number(), z.string(), z.null()]).optional(),
}).transform(data => {
    const toNumberOrNull = (val: number | string | null | undefined): number | null => {
        if (typeof val === 'number') return val;
        if (typeof val === 'string') {
            const num = parseFloat(val);
            return isNaN(num) ? null : num;
        }
        return null;
    };
    return {
        ...data,
        'IAT-1(50)': toNumberOrNull(data['IAT-1(50)']),
        'IAT-2(50)': toNumberOrNull(data['IAT-2(50)']),
        'Assignment-1(20)': toNumberOrNull(data['Assignment-1(20)']),
        'Assignment-2(20)': toNumberOrNull(data['Assignment-2(20)']),
    };
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
  // For simplicity, we'll remove existing marks for this sem/section/subject and insert new ones.
  // A more sophisticated approach might update existing records.
  await marksCollection.deleteMany({ semester, section, subjectCode });
  // Prepare marks for DB: use composite key as _id
  const marksToInsert = marks.map(mark => ({ ...mark, _id: mark.id }));
  await marksCollection.insertMany(marksToInsert as any[]); // Using any for _id temporarily
  console.log(`Saved ${marks.length} marks to DB for Sem: ${semester}, Sec: ${section}, Sub: ${subjectCode}`);
}

// Fetch marks from MongoDB
export async function fetchMarksFromStorage(semester: number, section: string, subjectCode: string): Promise<SubjectMark[]> {
  console.log(`Fetching marks from DB for Sem: ${semester}, Sec: ${section}, Sub: ${subjectCode}`);
  const marksCollection = await getMarksCollection();
  // Find by semester, section, subjectCode. Note: Section is not currently part of SubjectMark,
  // this implies that marks are specific to a section, which they are.
  // For now, we assume subjectCode and semester is enough to identify specific set of marks for a faculty.
  // If section must be stored, SubjectMark type needs update. The current upload logic implies context.
  const fetchedMarks = await marksCollection.find({ semester, subjectCode }).toArray();
  // Map _id back to id
  return fetchedMarks.map(doc => {
    const { _id, ...rest } = doc as any; // Cast to any to handle _id
    return { ...rest, id: _id } as SubjectMark; // Assume _id was the composite string id
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
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { raw: true, defval: null });

    const processedMarks: SubjectMark[] = [];
    const errorDetails: string[] = [];
    const studentProfilesCollection = await getStudentProfilesCollection();

    for (const [index, row] of jsonData.entries()) {
        if (!row || !row.USN) continue;

        const normalizedRow: any = {};
        for (const key in row) {
            normalizedRow[key.trim().toUpperCase()] = row[key];
        }

        const mappedRow = {
            USN: normalizedRow['USN'],
            NAME: normalizedRow['NAME'],
            'IAT-1(50)': normalizedRow['IAT-1(50)'],
            'IAT-2(50)': normalizedRow['IAT-2(50)'],
            'Assignment-1(20)': normalizedRow['ASSIGNMENT-1(20)'] || normalizedRow['ASSIGNMENT 1 (20)'],
            'Assignment-2(20)': normalizedRow['ASSIGNMENT-2(20)'] || normalizedRow['ASSIGNMENT 2 (20)'],
        };

        const rowValidation = MarkRowSchema.safeParse(mappedRow);
        if (!rowValidation.success) {
            errorDetails.push(`Row ${index + 2}: Validation Error - ${JSON.stringify(rowValidation.error.flatten().fieldErrors)} | Raw Data: ${JSON.stringify(row)}`);
            continue;
        }

        const rowData = rowValidation.data;
        const usn = String(rowData.USN).toUpperCase();
        
        // Fetch student profile from DB by USN (admissionId)
        const studentProfile = await studentProfilesCollection.findOne({ admissionId: usn });

        if (!studentProfile) {
            errorDetails.push(`Row ${index + 2}: USN "${usn}" not found in student records in DB.`);
            continue;
        }
        const studentId = studentProfile.userId;

        const markEntry: SubjectMark = {
            id: `${studentId}-${subjectCode}-${semester}`, // Composite ID
            studentId: studentId,
            usn: usn,
            studentName: String(rowData.NAME),
            subjectCode: subjectCode,
            subjectName: subjectName,
            semester: semester,
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

    await saveMarksToDb(processedMarks, semester, section, subjectCode);

    const message = errorDetails.length > 0
      ? `Successfully processed ${processedMarks.length} mark entries with ${errorDetails.length} errors.`
      : `Successfully processed ${processedMarks.length} mark entries.`;

    return {
      success: true,
      message: message,
      processedMarks: processedMarks,
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
        // Here, we might want to update individual mark records or replace them.
        // For simplicity, using the same saveMarksToDb which clears and re-inserts.
        await saveMarksToDb(marks, semester, section, subjectCode);
        return { success: true, message: "Edited marks saved successfully to DB." };
    } catch (error: any) {
        console.error("Error saving edited marks:", error);
        return { success: false, message: `Failed to save edited marks: ${error.message}` };
    }
}
