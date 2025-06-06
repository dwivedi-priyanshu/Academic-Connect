
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import type { StudentProfile } from '@/types';
import { Users, Search, Eye, Info, UserSearch } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { fetchStudentsForFacultyAction } from '@/actions/profile-actions';
import { useToast } from '@/hooks/use-toast';

export default function StudentLookupPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [allStudents, setAllStudents] = useState<StudentProfile[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Fetch all active students once (or on demand if list is too large)
  const loadAllStudents = useCallback(async () => {
    if (user && user.role === 'Faculty') {
      setIsLoading(true);
      try {
        // Fetch all students, no specific year/section filter initially for global search
        // Pass undefined or {} for filters to fetchAllStudentsForFacultyAction
        const data = await fetchStudentsForFacultyAction(user.id, {}); 
        setAllStudents(data);
        // Don't set filteredStudents here, wait for search term
      } catch (error) {
        console.error("Error fetching all students:", error);
        toast({ title: "Error Loading Students", description: (error as Error).message || "Could not load student directory.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
  }, [user, toast]);

  useEffect(() => {
    loadAllStudents();
  }, [loadAllStudents]);

  const handleSearch = () => {
    if (!searchTerm.trim()) {
      setFilteredStudents([]);
      setHasSearched(false);
      toast({ title: "Search term required", description: "Please enter a name or USN to search.", variant: "default" });
      return;
    }
    setHasSearched(true);
    setIsLoading(true);
    const lowerSearchTerm = searchTerm.toLowerCase();
    const results = allStudents.filter(student =>
      student.fullName.toLowerCase().includes(lowerSearchTerm) ||
      (student.admissionId && student.admissionId.toLowerCase().includes(lowerSearchTerm))
    );
    setFilteredStudents(results);
    setIsLoading(false);
    if (results.length === 0) {
        toast({ title: "No Results", description: `No students found matching "${searchTerm}".`, variant: "default" });
    }
  };


  if (!user || user.role !== 'Faculty') {
    return <p>Access denied. This page is for faculty members only.</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center"><UserSearch className="mr-2 h-8 w-8 text-primary" /> Student Lookup</h1>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Search for Students</CardTitle>
          <CardDescription>Enter a student's name or USN to find their profile and academic details.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex w-full max-w-lg items-center space-x-2">
            <Input
              type="search"
              placeholder="Enter name or USN..."
              className="flex-1 bg-background"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={isLoading}>
              <Search className="mr-2 h-4 w-4" /> Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {hasSearched && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Search Results ({filteredStudents.length})</CardTitle>
            <CardDescription>Students matching your search criteria "{searchTerm}".</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton rows={3} />
            ) : filteredStudents.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Admission ID (USN)</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-center">Semester</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.userId}>
                      <TableCell>
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={student.avatar || `https://placehold.co/40x40.png?text=${student.fullName.substring(0,1)}`} alt={student.fullName} data-ai-hint="person face" />
                          <AvatarFallback>{student.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">{student.fullName}</TableCell>
                      <TableCell>{student.admissionId}</TableCell>
                      <TableCell>{student.department}</TableCell>
                      <TableCell className="text-center">{student.currentSemester}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/faculty/student-lookup/${student.userId}/profile`}>
                            <Eye className="mr-1 h-3 w-3" /> View Profile
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center py-8 text-muted-foreground">
                No students found matching your search criteria.
              </p>
            )}
          </CardContent>
        </Card>
      )}
      {!hasSearched && !isLoading && (
         <Alert className="mt-6 bg-accent/20 border-accent text-accent-foreground">
             <Info className="h-5 w-5 text-accent" />
            <AlertTitle>Start Searching</AlertTitle>
            <AlertDescription>Use the search bar above to find student profiles by name or USN.</AlertDescription>
        </Alert>
       )}
    </div>
  );
}

const TableSkeleton = ({rows = 5} : {rows?: number}) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead className="w-12"></TableHead>
        <TableHead><Skeleton className="h-5 w-32" /></TableHead>
        <TableHead><Skeleton className="h-5 w-24" /></TableHead>
        <TableHead><Skeleton className="h-5 w-28" /></TableHead>
        <TableHead className="text-center"><Skeleton className="h-5 w-12 mx-auto" /></TableHead>
        <TableHead className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {[...Array(rows)].map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-10 w-10 rounded-full" /></TableCell>
          <TableCell><Skeleton className="h-4 w-full" /></TableCell>
          <TableCell><Skeleton className="h-4 w-full" /></TableCell>
          <TableCell><Skeleton className="h-4 w-full" /></TableCell>
          <TableCell><Skeleton className="h-4 w-full mx-auto" /></TableCell>
          <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);
