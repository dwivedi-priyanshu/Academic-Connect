'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import type { SubjectMark } from '@/types';
import { ClipboardList, Percent } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from '@/components/ui/skeleton';

// Mock data for student marks
const MOCK_MARKS_SEM1: SubjectMark[] = [
  { id: 'S1M1', subjectName: 'Applied Mathematics I', subjectCode: 'MA101', ia1: 20, ia2: 22, ia3: 25, assignment: 8, semester: 1, credits: 4 },
  { id: 'S1M2', subjectName: 'Engineering Physics', subjectCode: 'PH102', ia1: 18, ia2: 20, ia3: 23, assignment: 9, semester: 1, credits: 3 },
  { id: 'S1M3', subjectName: 'Basic Electrical Engineering', subjectCode: 'EE103', ia1: 22, ia2: 24, ia3: 21, assignment: 7, semester: 1, credits: 3 },
  { id: 'S1M4', subjectName: 'Programming in C', subjectCode: 'CS104', ia1: 25, ia2: 25, ia3: 24, assignment: 10, semester: 1, credits: 4 },
];
const MOCK_MARKS_SEM2: SubjectMark[] = [
  { id: 'S2M1', subjectName: 'Applied Mathematics II', subjectCode: 'MA201', ia1: 19, ia2: 21, ia3: 24, assignment: 7, semester: 2, credits: 4 },
  { id: 'S2M2', subjectName: 'Engineering Chemistry', subjectCode: 'CH202', ia1: 23, ia2: 22, ia3: 25, assignment: 9, semester: 2, credits: 3 },
  { id: 'S2M3', subjectName: 'Engineering Mechanics', subjectCode: 'ME203', ia1: 20, ia2: 18, ia3: 22, assignment: 8, semester: 2, credits: 3 },
  { id: 'S2M4', subjectName: 'Data Structures', subjectCode: 'CS204', ia1: 24, ia2: 23, ia3: 25, assignment: 10, semester: 2, credits: 4 },
];

const MOCK_ALL_MARKS: Record<string, SubjectMark[]> = {
  "1": MOCK_MARKS_SEM1,
  "2": MOCK_MARKS_SEM2,
}

// Mock function to fetch marks
const fetchStudentMarks = async (studentId: string, semester: string): Promise<SubjectMark[]> => {
  console.log(`Fetching marks for student ${studentId}, semester ${semester}`);
  await new Promise(resolve => setTimeout(resolve, 700)); // Simulate API delay
  return MOCK_ALL_MARKS[semester] || [];
};

const calculateTotal = (mark: SubjectMark) => {
  const iaTotal = ((mark.ia1 || 0) + (mark.ia2 || 0) + (mark.ia3 || 0)) / 3; // Example: average of 3 IAs
  return Math.round(iaTotal + (mark.assignment || 0)); // This logic can be very specific
};

export default function MarksPage() {
  const { user } = useAuth();
  const [marks, setMarks] = useState<SubjectMark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSemester, setSelectedSemester] = useState<string>("1");
  const semesters = ["1", "2", "3", "4", "5", "6", "7", "8"]; // Example semesters

  useEffect(() => {
    if (user && user.role === 'Student') {
      setIsLoading(true);
      fetchStudentMarks(user.id, selectedSemester).then(data => {
        setMarks(data);
        setIsLoading(false);
      });
    } else {
      setIsLoading(false); // Not a student or no user
    }
  }, [user, selectedSemester]);

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
          <CardDescription>Overview of your Internal Assessment (IA) and assignment marks.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-2 border-b">
                  <Skeleton className="h-8 w-1/3" />
                  <Skeleton className="h-8 w-1/6" />
                  <Skeleton className="h-8 w-1/6" />
                  <Skeleton className="h-8 w-1/6" />
                  <Skeleton className="h-8 w-1/6" />
                </div>
              ))}
            </div>
          ) : marks.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Subject Name</TableHead>
                  <TableHead>Subject Code</TableHead>
                  <TableHead className="text-center">IA 1</TableHead>
                  <TableHead className="text-center">IA 2</TableHead>
                  <TableHead className="text-center">IA 3</TableHead>
                  <TableHead className="text-center">Assignment</TableHead>
                  <TableHead className="text-center text-primary font-semibold">Total (Est.)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {marks.map((mark) => (
                  <TableRow key={mark.id}>
                    <TableCell className="font-medium">{mark.subjectName}</TableCell>
                    <TableCell>{mark.subjectCode}</TableCell>
                    <TableCell className="text-center">{mark.ia1 ?? 'N/A'}</TableCell>
                    <TableCell className="text-center">{mark.ia2 ?? 'N/A'}</TableCell>
                    <TableCell className="text-center">{mark.ia3 ?? 'N/A'}</TableCell>
                    <TableCell className="text-center">{mark.assignment ?? 'N/A'}</TableCell>
                    <TableCell className="text-center text-primary font-semibold">{calculateTotal(mark)}</TableCell>
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
