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
  'IAT-1(50)': z.union([z.number(), z.null()]).optional(),
  'IAT-2(50)': z.union([z.number(), z.null()]).optional(),
  'Assignment-1(20)': z.union([z.number(), z.null()]).optional(),
  'Assignment-2(20)': z.union([z.number(), z.null()]).optional(),
  // Add other columns if needed, e.g.,
  // 'Final Theory CIE(25)': z.union([z.number(), z.null()]).optional(),
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
async function saveMarksToStorage(marks: SubjectMark[], semester: number, section: string, subjectCode: string): Promise<void> {
  console.log(`Saving marks for Sem: ${semester}, Sec: ${section}, Sub: ${subjectCode}`);
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate async save
  const storageKey = `marks-${semester}-${section}-${subjectCode}`;
  localStorage.setItem(storageKey, JSON.stringify(marks));
  console.log(`Marks saved to localStorage key: ${storageKey}`);

   // Additionally, update individual student marks for the student page (if needed by existing logic)
   marks.forEach(mark => {
       const studentMarkKey = `marks-${mark.studentId}-${mark.subjectCode}`;
       // Fetch existing marks for the student/subject if any, merge/update, and save back
       // For simplicity in mock, just overwrite - a real app might need merging logic
       localStorage.setItem(studentMarkKey, JSON.stringify(mark));
   });

}

// MOCK: Function to fetch marks (replace with actual database/storage logic)
export async function fetchMarksFromStorage(semester: number, section: string, subjectCode: string): Promise<SubjectMark[]> {
    console.log(`Fetching marks for Sem: ${semester}, Sec: ${section}, Sub: ${subjectCode}`);
    await new Promise(resolve => setTimeout(resolve, 200)); // Simulate async fetch
    const storageKey = `marks-${semester}-${section}-${subjectCode}`;
    const storedData = localStorage.getItem(storageKey);
    return storedData ? JSON.parse(storedData) : [];
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
    // `raw: false` attempts to parse dates/numbers, `defval: null` sets empty cells to null
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: null });

    const processedMarks: SubjectMark[] = [];
    const errorDetails: string[] = [];

    jsonData.forEach((row, index) => {
      // Trim keys and convert to uppercase for case-insensitive matching
      const normalizedRow: any = {};
      for (const key in row) {
        normalizedRow[key.trim().toUpperCase()] = row[key];
      }

      // Map Excel columns to SubjectMark fields
      const mappedRow = {
        USN: normalizedRow['USN'],
        NAME: normalizedRow['NAME'],
        'IAT-1(50)': normalizedRow['IAT-1(50)'],
        'IAT-2(50)': normalizedRow['IAT-2(50)'],
        'Assignment-1(20)': normalizedRow['ASSIGNMENT-1(20)'],
        'Assignment-2(20)': normalizedRow['ASSIGNMENT-2(20)'],
      };

      const rowValidation = MarkRowSchema.safeParse(mappedRow);

      if (!rowValidation.success) {
        errorDetails.push(`Row ${index + 2}: Validation Error - ${JSON.stringify(rowValidation.error.flatten().fieldErrors)}`);
        return; // Skip this row
      }

      const rowData = rowValidation.data;
      const usn = rowData.USN.toUpperCase(); // Ensure USN is uppercase for matching
      const studentId = USN_TO_USERID_MAP[usn]; // Map USN to internal student ID

      if (!studentId) {
        errorDetails.push(`Row ${index + 2}: USN "${usn}" not found in student records.`);
        return; // Skip if student not found
      }

      // Create SubjectMark object
      const markEntry: SubjectMark = {
        id: `${studentId}-${subjectCode}-${semester}`, // Composite ID
        studentId: studentId,
        usn: usn,
        studentName: rowData.NAME,
        subjectCode: subjectCode,
        subjectName: subjectName,
        semester: semester,
        // Set marks, ensuring null for non-numeric or missing values
        ia1_50: typeof rowData['IAT-1(50)'] === 'number' ? rowData['IAT-1(50)'] : null,
        ia2_50: typeof rowData['IAT-2(50)'] === 'number' ? rowData['IAT-2(50)'] : null,
        assignment1_20: typeof rowData['Assignment-1(20)'] === 'number' ? rowData['Assignment-1(20)'] : null,
        assignment2_20: typeof rowData['Assignment-2(20)'] === 'number' ? rowData['Assignment-2(20)'] : null,
      };

      processedMarks.push(markEntry);
    });

    if (errorDetails.length > 0 && processedMarks.length === 0) {
        // If only errors and no valid marks processed, return failure
        return { success: false, message: "Failed to process marks from Excel. See error details.", errorDetails };
    }

    // Save the successfully processed marks
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
        console.log(`Saving EDITED marks for Sem: ${semester}, Sec: ${section}, Sub: ${subjectCode} by Faculty: ${facultyId}`);
        // Add validation here if needed (e.g., ensure marks are within range)
        await saveMarksToStorage(marks, semester, section, subjectCode);
        return { success: true, message: "Edited marks saved successfully." };
    } catch (error: any) {
        console.error("Error saving edited marks:", error);
        return { success: false, message: `Failed to save edited marks: ${error.message}` };
    }
}
