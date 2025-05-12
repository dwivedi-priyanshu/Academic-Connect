'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import type { StudentProfile } from '@/types';
import { Users, Search, Eye } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Mock student data
const MOCK_STUDENTS_DATA: StudentProfile[] = [
  { userId: 'student001', admissionId: 'S001', fullName: 'Alice Wonderland', dateOfBirth: '2002-05-10', contactNumber: '555-0101', address: '123 Rabbit Hole Lane', department: 'Computer Science', year: 2, section: 'A', parentName: 'Queen of Hearts', parentContact: '555-0102' },
  { userId: 'student002', admissionId: 'S002', fullName: 'Bob The Builder', dateOfBirth: '2001-11-20', contactNumber: '555-0103', address: '456 Construction Site', department: 'Mechanical Engineering', year: 3, section: 'B', parentName: 'Wendy', parentContact: '555-0104' },
  { userId: 'student003', admissionId: 'S003', fullName: 'Charlie Brown', dateOfBirth: '2003-02-15', contactNumber: '555-0105', address: '789 Peanut Street', department: 'Electronics Engineering', year: 1, section: 'A', parentName: 'Mr. Brown', parentContact: '555-0106' },
  { userId: 'student004', admissionId: 'S004', fullName: 'Diana Prince', dateOfBirth: '2000-08-01', contactNumber: '555-0107', address: 'Themyscira Island', department: 'Civil Engineering', year: 4, section: 'C', parentName: 'Hippolyta', parentContact: '555-0108' },
  { userId: 'student005', admissionId: 'S005', fullName: 'Edward Scissorhands', dateOfBirth: '2002-12-25', contactNumber: '555-0109', address: 'Gothic Mansion Hilltop', department: 'Computer Science', year: 2, section: 'B', parentName: 'The Inventor', parentContact: '555-0110' },
];

// Mock API to fetch students
const fetchStudents = async (): Promise<StudentProfile[]> => {
  console.log("Fetching all students for faculty");
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
  // In a real app, this would filter by faculty's department or courses.
  return MOCK_STUDENTS_DATA;
};


export default function FacultyStudentsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user && user.role === 'Faculty') {
      fetchStudents().then(data => {
        setStudents(data);
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const filteredStudents = useMemo(() => {
    return students.filter(student =>
      student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.admissionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.department.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [students, searchTerm]);

  if (!user || user.role !== 'Faculty') {
    return <p>Access denied. This page is for faculty members only.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center"><Users className="mr-2 h-8 w-8 text-primary" /> Student List</h1>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Manage Students</CardTitle>
          <CardDescription>View student profiles and academic details.</CardDescription>
          <div className="relative mt-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name, admission ID, department..."
              className="pl-8 sm:w-1/2 md:w-1/3 bg-background"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
              No students found matching your criteria.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
