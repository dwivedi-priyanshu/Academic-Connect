'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import type { SubjectMark } from '@/types';
import { ClipboardList, Percent } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from '@/components/ui/skeleton';
import { fetchMarksFromStorage } from '@/actions/marks-upload'; // Import the server action
import { useToast } from "@/hooks/use-toast";

// MOCK: Function to fetch marks for a specific student using the server action
// This is now a client-side function that CALLS the server action.
const fetchStudentMarksData = async (studentId: string, semester: number): Promise<SubjectMark[]> => {
  console.log(`Fetching marks data for student ${studentId}, semester ${semester} using server action`);
  await new Promise(resolve => setTimeout(resolve, 700)); // Simulate API delay

  // PROBLEM: fetchMarksFromStorage needs section and subjectCode, which we don't know easily here.
  // The current server action `fetchMarksFromStorage` is designed for faculty view (sem, section, subject).
  // We need a *different* server action or backend endpoint to fetch *all* marks for a given student across all subjects/semesters.

  // TEMPORARY WORKAROUND for MOCK:
  // Since we can't easily call the existing server action correctly from the student's perspective,
  // and the server action itself can't use localStorage, we will simulate fetching *all* potential marks
  // by iterating through localStorage *on the client* where it's available.
  // This is NOT how a real application should work but allows the demo to function.
  // A real app needs a dedicated backend API endpoint: GET /api/students/{studentId}/marks
  console.warn("Using temporary client-side localStorage access for student marks - needs proper backend API.");
  const allMarks: SubjectMark[] = [];
  if (typeof window !== 'undefined') { // Ensure localStorage is available
      for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('marks-')) { // Look for keys used by faculty upload/save
              try {
                  const data = JSON.parse(localStorage.getItem(key) || '[]');
                  if (Array.isArray(data)) {
                      // Filter marks for the current student from section/subject storage
                      allMarks.push(...data.filter(mark => mark.studentId === studentId));
                  } else if (typeof data === 'object' && data !== null && data.studentId === studentId) {
                      // Handle cases where data might be stored per student per subject (less likely with current save)
                      allMarks.push(data);
                  }
              } catch (e) {
                  console.error(`Error parsing localStorage key ${key}:`, e);
              }
          }
      }
  }
   // Remove duplicates based on unique ID and filter by the selected semester
   const uniqueMarks = Array.from(new Map(allMarks.map(mark => [mark.id, mark])).values());
   console.log(`Found ${uniqueMarks.length} unique mark entries for student ${studentId} via localStorage workaround.`);
   return uniqueMarks.filter(mark => mark.semester === semester);
};


export default function MarksPage() {
  const { user } = useAuth();
  const { toast } = useToast(); // Added toast
  const [marksForSemester, setMarksForSemester] = useState<SubjectMark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSemester, setSelectedSemester] = useState<string>("3"); // Default to sem 3 as per sample
  const semesters = ["1", "2", "3", "4", "5", "6", "7", "8"]; // Example semesters

  useEffect(() => {
    if (user && user.role === 'Student') {
      setIsLoading(true);
      const semesterNumber = parseInt(selectedSemester, 10);
      // Using the temporary client-side localStorage access function
      fetchStudentMarksData(user.id, semesterNumber).then(data => {
        setMarksForSemester(data);
        setIsLoading(false);
      }).catch(error => {
         console.error("Failed to fetch marks:", error);
         toast({ title: "Error", description: "Could not load marks.", variant: "destructive" });
         setIsLoading(false);
      });
    } else {
      setIsLoading(false); // Not a student or no user
    }
  }, [user, selectedSemester, toast]); // Refetch when user or semester changes


  if (!user || user.role !== 'Student') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <ClipboardList className="w-16 h-16 mb-4" />
        <p>This page is for students to view their marks.</p>
        <p>If you are a student, please ensure you are logged in correctly.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center"><ClipboardList className="mr-2 h-8 w-8 text-primary" /> My Academic Marks</h1>
        <div className="w-48">
          <Select value={selectedSemester} onValueChange={setSelectedSemester}>
            <SelectTrigger>
              <SelectValue placeholder="Select Semester" />
            </SelectTrigger>
            <SelectContent>
              {semesters.map(sem => (
                <SelectItem key={sem} value={sem}>Semester {sem}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Marks for Semester {selectedSemester}</CardTitle>
          <CardDescription>Overview of your Internal Assessment (IA) and Assignment marks.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-2 border-b">
                   {/* Update skeleton to match new columns */}
                   <Skeleton className="h-8 w-1/4" /> {/* Subject Name */}
                   <Skeleton className="h-8 w-1/6" /> {/* Subject Code */}
                   <Skeleton className="h-8 w-1/6" /> {/* IA 1 */}
                   <Skeleton className="h-8 w-1/6" /> {/* IA 2 */}
                   <Skeleton className="h-8 w-1/6" /> {/* Assign 1 */}
                   <Skeleton className="h-8 w-1/6" /> {/* Assign 2 */}
                </div>
              ))}
            </div>
          ) : marksForSemester.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Subject Name</TableHead>
                  <TableHead>Subject Code</TableHead>
                  <TableHead className="text-center">IA 1 (Max 50)</TableHead>
                  <TableHead className="text-center">IA 2 (Max 50)</TableHead>
                  <TableHead className="text-center">Assignment 1 (Max 20)</TableHead>
                  <TableHead className="text-center">Assignment 2 (Max 20)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {marksForSemester.map((mark) => (
                  <TableRow key={mark.id}>
                    <TableCell className="font-medium">{mark.subjectName}</TableCell>
                    <TableCell>{mark.subjectCode}</TableCell>
                    <TableCell className="text-center">{mark.ia1_50 ?? 'N/A'}</TableCell>
                    <TableCell className="text-center">{mark.ia2_50 ?? 'N/A'}</TableCell>
                    <TableCell className="text-center">{mark.assignment1_20 ?? 'N/A'}</TableCell>
                    <TableCell className="text-center">{mark.assignment2_20 ?? 'N/A'}</TableCell>
                    {/* Remove the calculated Total column */}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Percent className="mx-auto h-12 w-12 mb-4" />
              <p className="text-lg">No marks available for Semester {selectedSemester} yet.</p>
              <p>Please check back later or contact your faculty advisor.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
