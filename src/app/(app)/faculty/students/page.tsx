
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
import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { fetchStudentsForFacultyAction } from '@/actions/profile-actions';
import { useToast } from '@/hooks/use-toast';

const SEMESTERS = ["1", "2", "3", "4", "5", "6", "7", "8"];
const SECTIONS = ["A", "B", "C", "D"];

export default function FacultyStudentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [allStudentsFromSelection, setAllStudentsFromSelection] = useState<StudentProfile[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoadAttempted, setInitialLoadAttempted] = useState(false);

  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");

  useEffect(() => {
    // Reset subordinate filters and data when semester changes
    setSelectedSection(""); // Also reset section if semester changes, or make it conditional
    setFilteredStudents([]);
    setAllStudentsFromSelection([]);
    setInitialLoadAttempted(false);
  }, [selectedSemester]);

  useEffect(() => {
    if (user && user.role === 'Faculty' && selectedSemester && selectedSection) {
      setIsLoading(true);
      setInitialLoadAttempted(true);
      const year = Math.ceil(parseInt(selectedSemester) / 2);
      
      fetchStudentsForFacultyAction(user.id, { year, section: selectedSection }).then(data => {
        setAllStudentsFromSelection(data);
        setFilteredStudents(data);
        setIsLoading(false);
      }).catch(error => {
          console.error("Error fetching students:", error);
          toast({title: "Error", description: "Could not load student list.", variant: "destructive"});
          setIsLoading(false);
      });
    } else {
      setAllStudentsFromSelection([]);
      setFilteredStudents([]);
      setIsLoading(false);
      if (selectedSemester && selectedSection) {
        setInitialLoadAttempted(true); 
      }
    }
  }, [user, selectedSemester, selectedSection, toast]);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredStudents(allStudentsFromSelection);
    } else {
      setFilteredStudents(
        allStudentsFromSelection.filter(student =>
          student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.admissionId.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
  }, [searchTerm, allStudentsFromSelection]);


  if (!user || user.role !== 'Faculty') {
    return <p>Access denied. This page is for faculty members only.</p>;
  }

  const selectionMade = !!(selectedSemester && selectedSection);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center"><Users className="mr-2 h-8 w-8 text-primary" /> Student List</h1>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Select Class</CardTitle>
          <CardDescription>Choose the semester and section to view students.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </CardContent>
      </Card>

      {selectionMade && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Students for Semester {selectedSemester}, Section {selectedSection}</CardTitle>
            <CardDescription>View student profiles and academic details for the selected class.</CardDescription>
            <div className="relative mt-4">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search within this list by name or USN..."
                className="pl-8 sm:w-1/2 md:w-1/3 bg-background"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={isLoading}
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
                {initialLoadAttempted ? "No students found matching your criteria." : "Select options to load students."}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {!selectionMade && !isLoading && (
         <Alert className="mt-6 bg-accent/20 border-accent text-accent-foreground">
             <Info className="h-5 w-5 text-accent" />
            <AlertTitle>Select Class</AlertTitle>
            <AlertDescription>Please select a semester and section above to view the corresponding student list.</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
