'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import type { SubjectMark } from '@/types';
import { Edit3, UploadCloud, Save, BarChart, FileWarning, Info } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useToast } from "@/hooks/use-toast";
import { FileUploadInput } from '@/components/core/FileUploadInput';
import { uploadMarks, saveEditedMarks, fetchMarksFromStorage } from '@/actions/marks-upload'; // Import server actions
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from '@/components/ui/skeleton';

// Mock Data (can be fetched from backend)
const SEMESTERS = ["1", "2", "3", "4", "5", "6", "7", "8"];
const SECTIONS = ["A", "B", "C", "D"];
const SUBJECTS_BY_SEMESTER: Record<string, { code: string, name: string }[]> = {
  "1": [{ code: "MA101", name: "Applied Mathematics I" }, { code: "PH102", name: "Engineering Physics" }],
  "2": [{ code: "MA201", name: "Applied Mathematics II" }, { code: "CH202", name: "Engineering Chemistry" }],
  "3": [{ code: "CS201", name: "Data Structures" }, { code: "CS202", name: "Discrete Mathematics" }, { code: "MA201", name: "Probability & Statistics" }, { code: "DDCO", name: "Digital Design & Comp Org"}], // Added DDCO based on excel sample
  // Add more semesters and subjects
};

// Function to calculate basic summary statistics
const calculateSummary = (marks: SubjectMark[]) => {
    if (!marks || marks.length === 0) {
        return { count: 0, avgIA1: 'N/A', avgIA2: 'N/A', avgAssign1: 'N/A', avgAssign2: 'N/A' };
    }
    const validMarks = marks.filter(m => m.ia1_50 !== null || m.ia2_50 !== null || m.assignment1_20 !== null || m.assignment2_20 !== null);
    const count = validMarks.length;
    if (count === 0) {
         return { count: 0, avgIA1: 'N/A', avgIA2: 'N/A', avgAssign1: 'N/A', avgAssign2: 'N/A' };
    }

    const sumIA1 = validMarks.reduce((sum, m) => sum + (m.ia1_50 || 0), 0);
    const sumIA2 = validMarks.reduce((sum, m) => sum + (m.ia2_50 || 0), 0);
    const sumAssign1 = validMarks.reduce((sum, m) => sum + (m.assignment1_20 || 0), 0);
    const sumAssign2 = validMarks.reduce((sum, m) => sum + (m.assignment2_20 || 0), 0);

    const countIA1 = validMarks.filter(m => m.ia1_50 !== null).length;
    const countIA2 = validMarks.filter(m => m.ia2_50 !== null).length;
    const countAssign1 = validMarks.filter(m => m.assignment1_20 !== null).length;
    const countAssign2 = validMarks.filter(m => m.assignment2_20 !== null).length;


    return {
        count,
        avgIA1: countIA1 > 0 ? (sumIA1 / countIA1).toFixed(2) : 'N/A',
        avgIA2: countIA2 > 0 ? (sumIA2 / countIA2).toFixed(2) : 'N/A',
        avgAssign1: countAssign1 > 0 ? (sumAssign1 / countAssign1).toFixed(2) : 'N/A',
        avgAssign2: countAssign2 > 0 ? (sumAssign2 / countAssign2).toFixed(2) : 'N/A',
    };
};

export default function MarksEntryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<{ code: string, name: string } | null>(null);
  const [subjectsForSemester, setSubjectsForSemester] = useState<{ code: string, name: string }[]>([]);
  const [marksFile, setMarksFile] = useState<File | null>(null);
  const [marksData, setMarksData] = useState<SubjectMark[]>([]);
  const [isLoading, setIsLoading] = useState(false); // For fetching/displaying data
  const [isUploading, setIsUploading] = useState(false); // For file upload process
  const [isSavingEdits, setIsSavingEdits] = useState(false); // For saving edits
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false); // Track if initial fetch attempt was made

  // Fetch existing marks using the server action when selection changes
  useEffect(() => {
    const loadMarks = async () => {
      if (selectedSemester && selectedSection && selectedSubject && user) {
        setIsLoading(true);
        setInitialLoadComplete(false);
        setUploadErrors([]); // Clear previous errors
        setMarksData([]); // Clear existing data before fetching
        try {
          // Fetch marks using the server action
          const existingMarks = await fetchMarksFromStorage(
              parseInt(selectedSemester),
              selectedSection,
              selectedSubject.code
          );
          setMarksData(existingMarks);
           if (existingMarks.length === 0) {
               console.log("No existing marks found for this selection via server action.");
               // Optionally show a toast if needed, but the table will just be empty
           }
        } catch (error) {
            console.error("Error fetching marks via server action:", error);
            toast({ title: "Error", description: "Could not fetch existing marks.", variant: "destructive" });
            setMarksData([]); // Clear data on error
        } finally {
             setIsLoading(false);
             setInitialLoadComplete(true);
        }
      } else {
        setMarksData([]); // Clear marks if selection is incomplete
        setIsLoading(false);
        setInitialLoadComplete(false); // Reset initial load state
      }
    };
    loadMarks();
  }, [selectedSemester, selectedSection, selectedSubject, user, toast]);


  // Update subjects when semester changes
  useEffect(() => {
    setSubjectsForSemester(SUBJECTS_BY_SEMESTER[selectedSemester] || []);
    setSelectedSubject(null); // Reset subject selection when semester changes
  }, [selectedSemester]);


  const handleFileUpload = async () => {
    if (!marksFile || !selectedSemester || !selectedSection || !selectedSubject || !user) {
      toast({ title: "Missing Information", description: "Please select Semester, Section, Subject and upload a file.", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    setUploadErrors([]);
    setMarksData([]); // Clear current display while uploading new file

    try {
      const fileBuffer = await marksFile.arrayBuffer();
      const fileData = new Uint8Array(fileBuffer);

      // Call the server action for uploading
      const result = await uploadMarks({
        fileData,
        semester: parseInt(selectedSemester),
        section: selectedSection,
        subjectCode: selectedSubject.code,
        subjectName: selectedSubject.name,
        facultyId: user.id,
      });

      if (result.success) {
        setMarksData(result.processedMarks || []); // Update display with processed marks
        toast({ title: "Upload Successful", description: result.message, className: "bg-success text-success-foreground" });
        if (result.errorDetails && result.errorDetails.length > 0) {
            setUploadErrors(result.errorDetails);
        }
      } else {
        toast({ title: "Upload Failed", description: result.message, variant: "destructive" });
        setUploadErrors(result.errorDetails || [result.message]);
        // Optionally fetch existing marks again if upload fails completely
        // const existingMarks = await fetchMarksFromStorage(parseInt(selectedSemester), selectedSection, selectedSubject.code);
        // setMarksData(existingMarks);
      }
    } catch (error: any) {
      console.error("File upload error:", error);
      toast({ title: "Upload Error", description: `An unexpected error occurred: ${error.message}`, variant: "destructive" });
       setUploadErrors([`An unexpected error occurred: ${error.message}`]);
    } finally {
      setIsUploading(false);
      setMarksFile(null); // Clear the file input state
      // Focus management might be needed here if the file input is visually cleared
    }
  };

 const handleMarkChange = (studentId: string, field: keyof SubjectMark, value: string) => {
    const numericValue = value === '' ? null : parseInt(value, 10);
    const maxValues = { ia1_50: 50, ia2_50: 50, assignment1_20: 20, assignment2_20: 20 };

    // Basic client-side validation
    if (numericValue !== null && (isNaN(numericValue) || numericValue < 0 || (field in maxValues && numericValue > (maxValues as any)[field]))) {
        toast({ title: "Invalid Mark", description: `Mark must be a number between 0 and ${field in maxValues ? (maxValues as any)[field] : 'allowed range'}.`, variant: "destructive" });
        // Optionally revert the change or handle visually
        return;
    }

    setMarksData(prev =>
      prev.map(mark =>
        mark.studentId === studentId ? { ...mark, [field]: numericValue } : mark
      )
    );
  };


  const handleSaveChanges = async () => {
    if (!user || !selectedSemester || !selectedSection || !selectedSubject || marksData.length === 0) {
        toast({ title: "Cannot Save", description: "No marks data available or selection incomplete.", variant: "destructive" });
        return;
    }
    setIsSavingEdits(true);
    try {
        // Call the server action to save edits
        const result = await saveEditedMarks(
            marksData,
            parseInt(selectedSemester),
            selectedSection,
            selectedSubject.code,
            user.id
        );
        if (result.success) {
            toast({ title: "Changes Saved", description: result.message, className: "bg-success text-success-foreground" });
        } else {
            toast({ title: "Save Failed", description: result.message, variant: "destructive" });
            // Optionally refetch data to revert changes on failure
            // const existingMarks = await fetchMarksFromStorage(parseInt(selectedSemester), selectedSection, selectedSubject.code);
            // setMarksData(existingMarks);
        }
    } catch (error: any) {
        console.error("Error saving edited marks:", error);
        toast({ title: "Save Error", description: `An unexpected error occurred: ${error.message}`, variant: "destructive" });
    } finally {
        setIsSavingEdits(false);
    }
};


  const summary = useMemo(() => calculateSummary(marksData), [marksData]);
  const selectionMade = !!(selectedSemester && selectedSection && selectedSubject);


  if (!user || user.role !== 'Faculty') {
    return <p>Access denied. This page is for faculty members only.</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center"><Edit3 className="mr-2 h-8 w-8 text-primary" /> Marks Entry</h1>

      {/* Step 1: Selection */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Select Class and Subject</CardTitle>
          <CardDescription>Choose the semester, section, and subject to enter or view marks.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label htmlFor="semester">Semester</Label>
            <Select value={selectedSemester} onValueChange={setSelectedSemester}>
              <SelectTrigger id="semester"><SelectValue placeholder="Select Semester" /></SelectTrigger>
              <SelectContent>
                {SEMESTERS.map(sem => <SelectItem key={sem} value={sem}>Semester {sem}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="section">Section</Label>
            <Select value={selectedSection} onValueChange={setSelectedSection} disabled={!selectedSemester}>
              <SelectTrigger id="section"><SelectValue placeholder="Select Section" /></SelectTrigger>
              <SelectContent>
                {SECTIONS.map(sec => <SelectItem key={sec} value={sec}>Section {sec}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="subject">Subject</Label>
            <Select
              value={selectedSubject?.code || ""}
              onValueChange={(code) => setSelectedSubject(subjectsForSemester.find(s => s.code === code) || null)}
              disabled={!selectedSection || subjectsForSemester.length === 0}
            >
              <SelectTrigger id="subject"><SelectValue placeholder="Select Subject" /></SelectTrigger>
              <SelectContent>
                {subjectsForSemester.length > 0 ? (
                    subjectsForSemester.map(sub => <SelectItem key={sub.code} value={sub.code}>{sub.name} ({sub.code})</SelectItem>)
                ) : (
                    <SelectItem value="-" disabled>No subjects for this semester</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Upload */}
       {selectionMade && (
            <Card className="shadow-lg">
                <CardHeader>
                <CardTitle>Upload Marks File</CardTitle>
                <CardDescription>Upload the Excel sheet containing marks for {selectedSubject?.name} ({selectedSubject?.code}), Semester {selectedSemester}, Section {selectedSection}. This will replace any existing marks for this selection.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col md:flex-row items-start md:items-end gap-4">
                 <FileUploadInput
                    id="marksFile"
                    label="Select Excel File (.xlsx)"
                    onFileChange={setMarksFile}
                    accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    currentFile={marksFile?.name} // Show selected file name
                />
                <Button onClick={handleFileUpload} disabled={!marksFile || isUploading || isLoading}>
                    <UploadCloud className="mr-2 h-4 w-4" /> {isUploading ? 'Uploading...' : 'Upload & Process'}
                </Button>
                </CardContent>
            </Card>
        )}

         {/* Upload Errors Display */}
        {uploadErrors.length > 0 && (
             <Alert variant="destructive">
                 <FileWarning className="h-4 w-4"/>
                <AlertTitle>Upload Issues Detected</AlertTitle>
                <AlertDescription>
                    <ul className="list-disc pl-5 space-y-1 max-h-32 overflow-y-auto">
                    {uploadErrors.map((err, i) => <li key={i} className="text-xs">{err}</li>)}
                    </ul>
                </AlertDescription>
            </Alert>
        )}

      {/* Step 3: Display & Edit Marks Table */}
       {selectionMade && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Marks for {selectedSubject?.name} - Section {selectedSection}</CardTitle>
            <CardDescription>View and edit the marks below. Click 'Save Changes' after editing.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
                 <div className="space-y-2">
                    <p className="text-center text-muted-foreground py-4">Loading marks data...</p>
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                 </div>
            ) : !isUploading && marksData.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">USN</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead className="text-center w-24">IA 1 (50)</TableHead>
                      <TableHead className="text-center w-24">IA 2 (50)</TableHead>
                      <TableHead className="text-center w-28">Assign 1 (20)</TableHead>
                      <TableHead className="text-center w-28">Assign 2 (20)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {marksData.map((markEntry) => (
                      <TableRow key={markEntry.id}>
                        <TableCell className="font-mono text-xs">{markEntry.usn}</TableCell>
                        <TableCell className="font-medium">{markEntry.studentName}</TableCell>
                        {(['ia1_50', 'ia2_50', 'assignment1_20', 'assignment2_20'] as const).map(field => (
                          <TableCell key={field} className="px-2 py-1">
                            <Input
                              type="number"
                              className="w-20 text-center mx-auto bg-background h-8 text-sm"
                              value={markEntry[field] === null || markEntry[field] === undefined ? '' : String(markEntry[field])}
                              onChange={(e) => handleMarkChange(markEntry.studentId, field, e.target.value)}
                              min="0"
                              max={field.includes('50') ? "50" : "20"} // Dynamic max based on field name
                              disabled={isSavingEdits || isUploading}
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-6 flex justify-end">
                  <Button onClick={handleSaveChanges} disabled={isSavingEdits || isLoading || isUploading}>
                    <Save className="mr-2 h-4 w-4" /> {isSavingEdits ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            ) : (
                 !isUploading && initialLoadComplete && (
                    <p className="text-center py-8 text-muted-foreground">
                        No marks found for this selection. Upload an Excel file to add marks.
                    </p>
                 )
            )}
             {isUploading && (
                 <p className="text-center py-8 text-muted-foreground">Processing uploaded file...</p>
             )}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Performance Summary */}
      {selectionMade && !isLoading && !isUploading && marksData.length > 0 && (
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center"><BarChart className="mr-2 h-5 w-5 text-primary" /> Performance Summary</CardTitle>
                    <CardDescription>Overall statistics for {selectedSubject?.name} - Section {selectedSection}.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                        <div className="bg-muted/50 p-4 rounded-lg">
                            <p className="text-sm text-muted-foreground">Students</p>
                            <p className="text-2xl font-bold">{summary.count}</p>
                        </div>
                        <div className="bg-muted/50 p-4 rounded-lg">
                            <p className="text-sm text-muted-foreground">Avg. IA 1</p>
                            <p className="text-2xl font-bold">{summary.avgIA1}</p>
                        </div>
                         <div className="bg-muted/50 p-4 rounded-lg">
                            <p className="text-sm text-muted-foreground">Avg. IA 2</p>
                            <p className="text-2xl font-bold">{summary.avgIA2}</p>
                        </div>
                         <div className="bg-muted/50 p-4 rounded-lg">
                            <p className="text-sm text-muted-foreground">Avg. Assign 1</p>
                            <p className="text-2xl font-bold">{summary.avgAssign1}</p>
                        </div>
                         <div className="bg-muted/50 p-4 rounded-lg">
                            <p className="text-sm text-muted-foreground">Avg. Assign 2</p>
                            <p className="text-2xl font-bold">{summary.avgAssign2}</p>
                        </div>
                    </div>
                    {/* Add more complex charts or visualizations here if needed */}
                </CardContent>
            </Card>
       )}

      {/* Initial state message */}
       {!selectionMade && (
         <Alert className="mt-6 bg-accent/20 border-accent text-accent-foreground">
             <Info className="h-5 w-5 text-accent" />
            <AlertTitle>Select Class to Begin</AlertTitle>
            <AlertDescription>Please select a semester, section, and subject above to view or enter marks.</AlertDescription>
        </Alert>
       )}

    </div>
  );
}
