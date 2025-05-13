
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import type { SubjectMark } from '@/types';
import { ClipboardList, Percent } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from '@/components/ui/skeleton';
import { fetchStudentMarksAction } from '@/actions/student-data-actions'; // Import the server action
import { useToast } from "@/hooks/use-toast";


export default function MarksPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [marksForSemester, setMarksForSemester] = useState<SubjectMark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSemester, setSelectedSemester] = useState<string>("3"); // Default to sem 3
  const semesters = ["1", "2", "3", "4", "5", "6", "7", "8"]; 

  useEffect(() => {
    if (user && user.role === 'Student') {
      setIsLoading(true);
      const semesterNumber = parseInt(selectedSemester, 10);
      
      fetchStudentMarksAction(user.id, semesterNumber)
        .then(data => {
          setMarksForSemester(data);
          setIsLoading(false);
        })
        .catch(error => {
           console.error("Failed to fetch marks:", error);
           toast({ title: "Error", description: "Could not load your marks. Please try again later.", variant: "destructive" });
           setIsLoading(false);
        });
    } else {
      setIsLoading(false); 
    }
  }, [user, selectedSemester, toast]);


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
                   <Skeleton className="h-8 w-1/4" /> 
                   <Skeleton className="h-8 w-1/6" /> 
                   <Skeleton className="h-8 w-1/6" /> 
                   <Skeleton className="h-8 w-1/6" /> 
                   <Skeleton className="h-8 w-1/6" /> 
                   <Skeleton className="h-8 w-1/6" />
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
