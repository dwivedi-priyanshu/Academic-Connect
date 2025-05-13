
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
type MarkRowSchemaType = z.infer<typeof MarkRowSchema>;


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

// Configuration for mapping schema fields to possible Excel header variations (all in uppercase and trimmed)
const headerMappingConfig: Record<keyof MarkRowSchemaType, string[]> = {
  USN: ['USN', 'STUDENT USN', 'ADMISSIONID', 'ADMISSION ID', 'UNIVERSITY SEAT NUMBER'],
  NAME: ['NAME', 'STUDENT NAME', 'CANDIDATE NAME'],
  'IAT-1(50)': ['IAT-1(50)', 'IAT 1(50)', 'IAT-1 (50)', 'IAT 1 (50)', 'INTERNAL ASSESSMENT TEST 1 (50)', 'INTERNAL ASSESSMENT TEST-1 (50)', 'IAT1(50)', 'IAT1'],
  'IAT-2(50)': ['IAT-2(50)', 'IAT 2(50)', 'IAT-2 (50)', 'IAT 2 (50)', 'INTERNAL ASSESSMENT TEST 2 (50)', 'INTERNAL ASSESSMENT TEST-2 (50)', 'IAT2(50)', 'IAT2'],
  'Assignment-1(20)': ['ASSIGNMENT-1(20)', 'ASSIGNMENT 1(20)', 'ASSIGNMENT-1 (20)', 'ASSIGNMENT 1 (20)', 'ASSIGNMENT MARKS 1 (20)', 'ASSIGN1(20)', 'ASSIGN1'],
  'Assignment-2(20)': ['ASSIGNMENT-2(20)', 'ASSIGNMENT 2(20)', 'ASSIGNMENT-2 (20)', 'ASSIGNMENT 1 (20)', 'ASSIGNMENT MARKS 2 (20)', 'ASSIGN2(20)', 'ASSIGN2'],
};

// Helper function to get value from normalized row data based on possible header variations
function getValueFromNormalizedRow(normalizedRowData: Record<string, any>, fieldSchemaKey: keyof MarkRowSchemaType): any {
  const possibleHeaderKeys = headerMappingConfig[fieldSchemaKey];
  if (!possibleHeaderKeys) return undefined;

  for (const headerKey of possibleHeaderKeys) {
    if (normalizedRowData.hasOwnProperty(headerKey)) {
      return normalizedRowData[headerKey];
    }
  }
  return undefined;
}


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
  await marksCollection.deleteMany({ semester, subjectCode, $comment: `Faculty is uploading for section ${section}` });
  const marksToInsert = marks.map(mark => ({ ...mark, _id: mark.id }));
  await marksCollection.insertMany(marksToInsert as any[]);
  console.log(`Saved ${marks.length} marks to DB for Sem: ${semester}, Sec: ${section}, Sub: ${subjectCode}`);
}

// Fetch marks from MongoDB
export async function fetchMarksFromStorage(semester: number, section: string, subjectCode: string): Promise<SubjectMark[]> {
  console.log(`Fetching marks from DB for Sem: ${semester}, Sec: ${section}, Sub: ${subjectCode}`);
  const marksCollection = await getMarksCollection();
  const fetchedMarks = await marksCollection.find({ semester, subjectCode }).toArray();
  return fetchedMarks.map(doc => {
    const { _id, ...rest } = doc as any; 
    return { ...rest, id: _id, _id: _id } as SubjectMark; 
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
        const normalizedRow: Record<string, any> = {};
        
        for (const key in row) {
            if (row.hasOwnProperty(key) && row[key] !== null && String(row[key]).trim() !== "") { 
                 const trimmedUpperKey = key.trim().toUpperCase();
                 normalizedRow[trimmedUpperKey] = row[key];
            }
        }
        
        const actualUsnValue = getValueFromNormalizedRow(normalizedRow, 'USN');
        const usnForLogging = actualUsnValue && String(actualUsnValue).trim() !== "" ? String(actualUsnValue).trim().toUpperCase() : null;

        // Skip row if it's effectively empty or actual USN is missing/empty after normalization
        if (Object.keys(normalizedRow).length === 0 || !usnForLogging) {
            if (Object.keys(row).every(k => row[k] === null || String(row[k]).trim() === "")) {
                 console.log(`Skipping completely empty row ${index + 2} (all cells empty or null).`);
            } else if (Object.keys(normalizedRow).length === 0 && Object.keys(row).length > 0){
                console.log(`Skipping row ${index + 2} as it appears to be an empty data row (e.g. only headers with no data or unmapped headers). Raw: ${JSON.stringify(row)}`);
            } else {
                errorDetails.push(`Row ${index + 2}: Skipped due to missing or empty USN. Ensure one of these headers is present and filled: ${headerMappingConfig.USN.join(', ')}. Detected USN: '${actualUsnValue === undefined ? 'undefined' : actualUsnValue}'`);
                console.log(`Skipping row ${index + 2} due to missing or empty USN. Raw data: ${JSON.stringify(row)}, Normalized: ${JSON.stringify(normalizedRow)}, Actual USN from helper: ${actualUsnValue}`);
            }
            continue;
        }

        const mappedRowForValidation = {
          USN: actualUsnValue, // Use the already fetched USN
          NAME: getValueFromNormalizedRow(normalizedRow, 'NAME'),
          'IAT-1(50)': getValueFromNormalizedRow(normalizedRow, 'IAT-1(50)'),
          'IAT-2(50)': getValueFromNormalizedRow(normalizedRow, 'IAT-2(50)'),
          'Assignment-1(20)': getValueFromNormalizedRow(normalizedRow, 'Assignment-1(20)'),
          'Assignment-2(20)': getValueFromNormalizedRow(normalizedRow, 'Assignment-2(20)'),
        };
        
        const rowValidation = MarkRowSchema.safeParse(mappedRowForValidation);

        if (!rowValidation.success) {
            errorDetails.push(`Row ${index + 2} (USN: ${usnForLogging || 'unknown'}): Validation Error - ${JSON.stringify(rowValidation.error.flatten().fieldErrors)}. Ensure all required headers like NAME are present and marks are valid. Raw Mapped Data: ${JSON.stringify(mappedRowForValidation)}`);
            continue;
        }

        const rowData = rowValidation.data;
        const studentUSN = String(rowData.USN).toUpperCase(); 
        
        const studentProfile = await studentProfilesCollection.findOne({ admissionId: studentUSN });

        if (!studentProfile) {
            errorDetails.push(`Row ${index + 2}: USN "${studentUSN}" not found in student records. Marks for this student will not be processed.`);
            continue;
        }
        const studentId = studentProfile.id || studentProfile._id?.toHexString();
        if(!studentId) {
            errorDetails.push(`Row ${index + 2}: USN "${studentUSN}" found, but student record is missing a valid ID.`);
            continue;
        }

        const markEntry: SubjectMark = {
            id: `${studentId}-${subjectCode}-${semester}`,
            _id: `${studentId}-${subjectCode}-${semester}`,
            studentId: studentId,
            usn: studentUSN,
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

    if (processedMarks.length > 0) {
        await saveMarksToDb(processedMarks, semester, section, subjectCode);
    }

    const message = errorDetails.length > 0
      ? `Processed ${processedMarks.length} mark entries with ${errorDetails.length} errors. Check details.`
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
        await saveMarksToDb(marks, semester, section, subjectCode);
        return { success: true, message: "Edited marks saved successfully." };
    } catch (error: any) {
        console.error("Error saving edited marks:", error);
        return { success: false, message: `Failed to save edited marks: ${error.message}` };
    }
}

