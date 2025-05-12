'use server';

import * as XLSX from 'xlsx';
import { z } from 'zod';
import type { SubjectMark } from '@/types';
import { USN_TO_USERID_MAP } from '@/types'; // Import the map

// Zod schema for validating row data extracted from Excel
// Match column names from the Excel image (case-insensitive check is good)
const MarkRowSchema = z.object({
  USN: z.string().trim().min(1, "USN cannot be empty"),
  NAME: z.string().trim().min(1, "Name cannot be empty"),
  'IAT-1(50)': z.union([z.number(), z.string(), z.null()]).optional(), // Allow string to handle cases like 'AB'
  'IAT-2(50)': z.union([z.number(), z.string(), z.null()]).optional(), // Allow string
  'Assignment-1(20)': z.union([z.number(), z.string(), z.null()]).optional(), // Allow string
  'Assignment-2(20)': z.union([z.number(), z.string(), z.null()]).optional(), // Allow string
  // Add other columns if needed, e.g.,
  // 'Final Theory CIE(25)': z.union([z.number(), z.null()]).optional(),
}).transform(data => {
    // Convert numeric fields, treat non-numeric like 'AB' or empty as null
    const toNumberOrNull = (val: number | string | null | undefined): number | null => {
        if (typeof val === 'number') return val;
        if (typeof val === 'string') {
            const num = parseFloat(val);
            return isNaN(num) ? null : num; // Return null if not a valid number (covers 'AB', etc.)
        }
        return null; // Return null for null, undefined, or other types
    };

    return {
        ...data,
        'IAT-1(50)': toNumberOrNull(data['IAT-1(50)']),
        'IAT-2(50)': toNumberOrNull(data['IAT-2(50)']),
        'Assignment-1(20)': toNumberOrNull(data['Assignment-1(20)']),
        'Assignment-2(20)': toNumberOrNull(data['Assignment-2(20)']),
    };
});


// Input schema for the server action
const UploadMarksInputSchema = z.object({
  fileData: z.instanceof(Uint8Array).describe('The Excel file content as Uint8Array'),
  semester: z.coerce.number().min(1).max(8),
  section: z.string().trim().min(1),
  subjectCode: z.string().trim().min(1),
  subjectName: z.string().trim().min(1),
  facultyId: z.string().trim().min(1),
});
export type UploadMarksInput = z.infer<typeof UploadMarksInputSchema>;

// Output schema for the server action
const UploadMarksOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  processedMarks: z.array(z.custom<SubjectMark>()).optional(), // Return the processed marks for display
  errorDetails: z.array(z.string()).optional(), // Details about validation errors
});
export type UploadMarksOutput = z.infer<typeof UploadMarksOutputSchema>;


// MOCK: Function to save marks (replace with actual database/storage logic)
// This function runs on the server and cannot use localStorage.
async function saveMarksToStorage(marks: SubjectMark[], semester: number, section: string, subjectCode: string): Promise<void> {
  console.log(`MOCK: Saving marks for Sem: ${semester}, Sec: ${section}, Sub: ${subjectCode} (Server Action)`);
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate async save
  // In a real app, save to Firestore or other database here.
  // Do NOT use localStorage in server actions.
  console.log(`MOCK: ${marks.length} marks processed for saving.`);
}

// MOCK: Function to fetch marks (replace with actual database/storage logic)
// This function runs on the server and cannot use localStorage.
export async function fetchMarksFromStorage(semester: number, section: string, subjectCode: string): Promise<SubjectMark[]> {
    console.log(`MOCK: Fetching marks for Sem: ${semester}, Sec: ${section}, Sub: ${subjectCode} (Server Action)`);
    await new Promise(resolve => setTimeout(resolve, 200)); // Simulate async fetch
    // In a real app, fetch from Firestore or other database here.
    // Do NOT use localStorage in server actions.
    // Return empty array for mock purposes as there's no persistent server storage yet.
    return [];
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

    // Convert sheet to JSON, handling potential header variations
    // We expect headers like USN, NAME, IAT-1(50), etc.
    // `raw: true` keeps values as they are, we'll parse them with Zod
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { raw: true, defval: null });

    const processedMarks: SubjectMark[] = [];
    const errorDetails: string[] = [];

    jsonData.forEach((row, index) => {
        // Basic check if row seems empty or irrelevant
        if (!row || !row.USN) {
          // console.log(`Skipping empty or invalid row ${index + 2}`);
          return;
        }

      // Trim keys and convert to uppercase for case-insensitive matching
      const normalizedRow: any = {};
      for (const key in row) {
        normalizedRow[key.trim().toUpperCase()] = row[key];
      }

      // Map Excel columns to SubjectMark fields - handle potential key variations
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
        // Include row data in error for better debugging
        errorDetails.push(`Row ${index + 2}: Validation Error - ${JSON.stringify(rowValidation.error.flatten().fieldErrors)} | Raw Data: ${JSON.stringify(row)}`);
        return; // Skip this row
      }

      const rowData = rowValidation.data;
      const usn = String(rowData.USN).toUpperCase(); // Ensure USN is uppercase string for matching
      const studentId = USN_TO_USERID_MAP[usn]; // Map USN to internal student ID

      if (!studentId) {
        errorDetails.push(`Row ${index + 2}: USN "${usn}" not found in student records.`);
        return; // Skip if student not found
      }

      // Create SubjectMark object using validated and transformed data
      const markEntry: SubjectMark = {
        id: `${studentId}-${subjectCode}-${semester}`, // Composite ID
        studentId: studentId,
        usn: usn,
        studentName: String(rowData.NAME), // Ensure name is string
        subjectCode: subjectCode,
        subjectName: subjectName,
        semester: semester,
        ia1_50: rowData['IAT-1(50)'],
        ia2_50: rowData['IAT-2(50)'],
        assignment1_20: rowData['Assignment-1(20)'],
        assignment2_20: rowData['Assignment-2(20)'],
      };

      processedMarks.push(markEntry);
    });

    if (errorDetails.length > 0 && processedMarks.length === 0) {
        // If only errors and no valid marks processed, return failure
        return { success: false, message: "Failed to process marks from Excel. See error details.", errorDetails };
    }

    // Save the successfully processed marks (to mock server storage)
    await saveMarksToStorage(processedMarks, semester, section, subjectCode);

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
    };
  }
}

// Server action to save edited marks
export async function saveEditedMarks(marks: SubjectMark[], semester: number, section: string, subjectCode: string, facultyId: string): Promise<{ success: boolean; message: string }> {
    try {
        console.log(`MOCK: Saving EDITED marks for Sem: ${semester}, Sec: ${section}, Sub: ${subjectCode} by Faculty: ${facultyId} (Server Action)`);
        // Add validation here if needed (e.g., ensure marks are within range)
        await saveMarksToStorage(marks, semester, section, subjectCode); // Use the server-side mock save
        return { success: true, message: "Edited marks saved successfully (mock)." };
    } catch (error: any) {
        console.error("Error saving edited marks:", error);
        return { success: false, message: `Failed to save edited marks: ${error.message}` };
    }
}
