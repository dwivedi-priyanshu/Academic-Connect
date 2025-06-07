
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import type { MoocCourseWithStudentInfo } from '@/types';
import { Archive, Download, Search, CalendarDays } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useToast } from "@/hooks/use-toast";
import { fetchApprovedMoocsForCoordinatorAction } from '@/actions/academic-submission-actions';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function MoocRepositoryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [approvedMoocs, setApprovedMoocs] = useState<MoocCourseWithStudentInfo[]>([]);
  const [filteredMoocs, setFilteredMoocs] = useState<MoocCourseWithStudentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user && user.role === 'Faculty') {
      setIsLoading(true);
      fetchApprovedMoocsForCoordinatorAction(user.id)
        .then(data => {
          setApprovedMoocs(data);
          setFilteredMoocs(data);
        })
        .catch(err => {
          console.error("Error fetching approved MOOCs:", err);
          toast({ title: "Error", description: (err as Error).message || "Could not load MOOC repository.", variant: "destructive" });
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredMoocs(approvedMoocs);
    } else {
      setFilteredMoocs(
        approvedMoocs.filter(mooc =>
          mooc.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          mooc.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          mooc.platform.toLowerCase().includes(searchTerm.toLowerCase()) ||
          String(mooc.submissionSemester).includes(searchTerm)
        )
      );
    }
  }, [searchTerm, approvedMoocs]);

  if (!user || user.role !== 'Faculty') {
    return <p>Access denied. This page is for faculty members only.</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center"><Archive className="mr-2 h-8 w-8 text-primary" /> MOOC Repository</h1>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Approved MOOC Submissions</CardTitle>
          <CardDescription>Browse approved MOOCs for the semesters you coordinate.</CardDescription>
           <div className="relative mt-4">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by course, student, platform, semester..."
                className="pl-8 sm:w-full md:w-1/2 lg:w-1/3 bg-background"
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
                  <TableHead>Student</TableHead>
                  <TableHead>Course Name</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Certificate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : filteredMoocs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Course Name</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Certificate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMoocs.map(mooc => (
                  <TableRow key={mooc.id}>
                    <TableCell>{mooc.studentName}</TableCell>
                    <TableCell className="font-medium">{mooc.courseName}</TableCell>
                    <TableCell>{mooc.platform}</TableCell>
                    <TableCell className="text-center">{mooc.submissionSemester}</TableCell>
                    <TableCell>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <CalendarDays className="h-3 w-3"/>
                            {format(new Date(mooc.submittedDate), "PP")}
                        </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {mooc.certificateUrl ? (
                        <Button variant="outline" size="sm" asChild>
                          <a href={mooc.certificateUrl} target="_blank" rel="noopener noreferrer">
                            <Download className="mr-1 h-3 w-3" /> View
                          </a>
                        </Button>
                      ) : (
                        <Badge variant="secondary" className="text-xs">No Certificate</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              {searchTerm ? `No approved MOOCs match your search term "${searchTerm}".` : "No approved MOOCs found for your coordinated semesters."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

