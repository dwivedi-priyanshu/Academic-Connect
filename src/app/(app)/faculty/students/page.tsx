'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import type { StudentProfile } from '@/types';
import { Users, Search, Eye, Info } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Mock student data
const MOCK_STUDENTS_DATA: StudentProfile[] = [
  { userId: 'student001', admissionId: 'S001', fullName: 'Alice Wonderland', dateOfBirth: '2002-05-10', contactNumber: '555-0101', address: '123 Rabbit Hole Lane', department: 'Computer Science', year: 3, section: 'A', parentName: 'Queen of Hearts', parentContact: '555-0102' },
  { userId: 'student002', admissionId: 'S002', fullName: 'Bob The Builder', dateOfBirth: '2001-11-20', contactNumber: '555-0103', address: '456 Construction Site', department: 'Computer Science', year: 3, section: 'A', parentName: 'Wendy', parentContact: '555-0104' }, // Changed dept/year/section for testing filter
  { userId: 'student003', admissionId: 'S003', fullName: 'Charlie Brown', dateOfBirth: '2003-02-15', contactNumber: '555-0105', address: '789 Peanut Street', department: 'Computer Science', year: 3, section: 'B', parentName: 'Mr. Brown', parentContact: '555-0106' },
  { userId: 'student004', admissionId: 'S004', fullName: 'Diana Prince', dateOfBirth: '2000-08-01', contactNumber: '555-0107', address: 'Themyscira Island', department: 'Civil Engineering', year: 4, section: 'C', parentName: 'Hippolyta', parentContact: '555-0108' },
  { userId: 'student005', admissionId: 'S005', fullName: 'Edward Scissorhands', dateOfBirth: '2002-12-25', contactNumber: '555-0109', address: 'Gothic Mansion Hilltop', department: 'Computer Science', year: 3, section: 'B', parentName: 'The Inventor', parentContact: '555-0110' },
];

// Mock API to fetch students (now simulates filtering)
const fetchStudents = async (semester?: number, section?: string, subjectCode?: string): Promise<StudentProfile[]> => {
  console.log(`Fetching students for Sem: ${semester}, Sec: ${section}, Sub: ${subjectCode}`);
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay

  // In a real app, this would filter by faculty's department/courses and the selected criteria.
  // Mock filtering: Filter MOCK_STUDENTS_DATA based on year (derived from semester) and section.
  // Subject filtering isn't directly possible with current StudentProfile structure, but IRL the backend would handle it.
  const year = semester ? Math.ceil(semester / 2) : undefined;

  let filtered = MOCK_STUDENTS_DATA;
  if (year) {
    filtered = filtered.filter(s => s.year === year);
  }
  if (section) {
    filtered = filtered.filter(s => s.section === section);
  }
  // We won't filter by subject in the mock as it's not on the student profile.

  return filtered;
};

// Mock data for selections (same as marks-entry)
const SEMESTERS = ["1", "2", "3", "4", "5", "6", "7", "8"];
const SECTIONS = ["A", "B", "C", "D"];
const SUBJECTS_BY_SEMESTER: Record<string, { code: string, name: string }[]> = {
  "1": [{ code: "MA101", name: "Applied Mathematics I" }, { code: "PH102", name: "Engineering Physics" }],
  "2": [{ code: "MA201", name: "Applied Mathematics II" }, { code: "CH202", name: "Engineering Chemistry" }],
  "3": [{ code: "CS201", name: "Data Structures" }, { code: "CS202", name: "Discrete Mathematics" }, { code: "MA201", name: "Probability & Statistics" }, { code: "DDCO", name: "Digital Design & Comp Org"}],
   "4": [{ code: "CS401", name: "Algorithms" }, { code: "CS402", name: "Operating Systems" }],
   // Add more semesters and subjects
};


export default function FacultyStudentsPage() {
  const { user } = useAuth();
  const [allStudents, setAllStudents] = useState<StudentProfile[]>([]); // Holds potentially all faculty-related students
  const [filteredStudents, setFilteredStudents] = useState<StudentProfile[]>([]); // Holds students filtered by selections AND search
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Only loading when fetching based on selection
  const [initialLoadComplete, setInitialLoadComplete] = useState(false); // Track initial page load

  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<{ code: string, name: string } | null>(null);
  const [subjectsForSemester, setSubjectsForSemester] = useState<{ code: string, name: string }[]>([]);

  // Update subjects when semester changes
  useEffect(() => {
    setSubjectsForSemester(SUBJECTS_BY_SEMESTER[selectedSemester] || []);
    setSelectedSubject(null); // Reset subject selection when semester changes
    setFilteredStudents([]); // Clear student list when semester changes
  }, [selectedSemester]);

  // Fetch students when selections are complete
  useEffect(() => {
    if (user && user.role === 'Faculty' && selectedSemester && selectedSection && selectedSubject) {
      setIsLoading(true);
      fetchStudents(parseInt(selectedSemester), selectedSection, selectedSubject.code).then(data => {
        setAllStudents(data); // Store the list based on selection
        setFilteredStudents(data); // Initially display all fetched students
        setIsLoading(false);
        setInitialLoadComplete(true);
      }).catch(error => {
          console.error("Error fetching students:", error);
          setIsLoading(false);
          setInitialLoadComplete(true); // Mark load as complete even on error
      });
    } else {
      setAllStudents([]); // Clear if selection is incomplete
      setFilteredStudents([]);
      setIsLoading(false);
       // Don't set initialLoadComplete here, wait for selections
    }
  }, [user, selectedSemester, selectedSection, selectedSubject]);

  // Filter based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredStudents(allStudents); // If search is cleared, show all students from selection
    } else {
      setFilteredStudents(
        allStudents.filter(student =>
          student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.admissionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.department.toLowerCase().includes(searchTerm.toLowerCase()) // department might be redundant if filtering by selection
        )
      );
    }
  }, [searchTerm, allStudents]);


  if (!user || user.role !== 'Faculty') {
    return <p>Access denied. This page is for faculty members only.</p>;
  }

  const selectionMade = !!(selectedSemester && selectedSection && selectedSubject);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center"><Users className="mr-2 h-8 w-8 text-primary" /> Student List</h1>
      </div>

      {/* Selection Card */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Select Class and Subject</CardTitle>
          <CardDescription>Choose the semester, section, and subject to view students.</CardDescription>
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
                    <SelectItem value="-" disabled>No subjects found</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Student List Card - Shows only after selection */}
      {selectionMade && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Students for {selectedSubject?.name} ({selectedSubject?.code}) - Sem {selectedSemester}, Sec {selectedSection}</CardTitle>
            <CardDescription>View student profiles and academic details for the selected class.</CardDescription>
            <div className="relative mt-4">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search within this list..."
                className="pl-8 sm:w-1/2 md:w-1/3 bg-background"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={isLoading} // Disable search while loading
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Admission ID</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-center">Year</TableHead>
                    <TableHead className="text-center">Section</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-10 w-10 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : filteredStudents.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead> {/* For Avatar */}
                    <TableHead>Name</TableHead>
                    <TableHead>Admission ID</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-center">Year</TableHead>
                    <TableHead className="text-center">Section</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.userId}>
                      <TableCell>
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={`https://picsum.photos/seed/${student.userId}/40/40`} alt={student.fullName} data-ai-hint="person face" />
                          <AvatarFallback>{student.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">{student.fullName}</TableCell>
                      <TableCell>{student.admissionId}</TableCell>
                      <TableCell>{student.department}</TableCell>
                      <TableCell className="text-center">{student.year}</TableCell>
                      <TableCell className="text-center">{student.section}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/faculty/students/${student.userId}/profile`}>
                            <Eye className="mr-1 h-3 w-3" /> View
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center py-8 text-muted-foreground">
                {initialLoadComplete ? "No students found matching your criteria." : "Loading students..."}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Show message if no selection is made */}
      {!selectionMade && !isLoading && (
         <Alert className="mt-6 bg-accent/20 border-accent text-accent-foreground">
             <Info className="h-5 w-5 text-accent" />
            <AlertTitle>Select Class</AlertTitle>
            <AlertDescription>Please select a semester, section, and subject above to view the corresponding student list.</AlertDescription>
        </Alert>
      )}

    </div>
  );
}
