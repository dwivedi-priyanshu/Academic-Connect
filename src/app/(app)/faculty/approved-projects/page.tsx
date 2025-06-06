
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import type { MiniProject } from '@/types';
import { LibraryBig, Download, Eye, Search, CalendarDays } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { useToast } from "@/hooks/use-toast";
import { fetchAllApprovedProjectsAction } from '@/actions/academic-submission-actions';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function ApprovedProjectsRepositoryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [approvedProjects, setApprovedProjects] = useState<MiniProject[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<MiniProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user && user.role === 'Faculty') {
      setIsLoading(true);
      fetchAllApprovedProjectsAction()
        .then(data => {
          setApprovedProjects(data);
          setFilteredProjects(data);
        })
        .catch(err => {
          console.error("Error fetching approved projects:", err);
          toast({ title: "Error", description: "Could not load approved projects.", variant: "destructive" });
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredProjects(approvedProjects);
    } else {
      setFilteredProjects(
        approvedProjects.filter(project =>
          project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (project.studentName && project.studentName.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (project.guideName && project.guideName.toLowerCase().includes(searchTerm.toLowerCase())) ||
          project.subject.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
  }, [searchTerm, approvedProjects]);

  if (!user || user.role !== 'Faculty') {
    return <p>Access denied. This page is for faculty members only.</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center"><LibraryBig className="mr-2 h-8 w-8 text-primary" /> Approved Projects Repository</h1>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>All Approved Mini-Projects</CardTitle>
          <CardDescription>Browse and view details of all approved mini-projects across the institution.</CardDescription>
           <div className="relative mt-4">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by title, student, guide, subject..."
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
                  <TableHead>Title</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Guide</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Files</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell className="text-right space-x-1">
                      <Skeleton className="h-8 w-10 inline-block" />
                      <Skeleton className="h-8 w-10 inline-block" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : filteredProjects.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Guide</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Files</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map(project => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">{project.title}</TableCell>
                    <TableCell>{project.studentName || 'N/A'}</TableCell>
                    <TableCell>{project.subject}</TableCell>
                    <TableCell>{project.guideName || 'N/A'}</TableCell>
                    <TableCell>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <CalendarDays className="h-3 w-3"/>
                            {format(new Date(project.submittedDate), "PP")}
                        </div>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {project.pptUrl ? (
                        <Button variant="outline" size="sm" asChild>
                          <a href={project.pptUrl} target="_blank" rel="noopener noreferrer">
                            <Download className="mr-1 h-3 w-3" /> PPT
                          </a>
                        </Button>
                      ) : (
                        <Badge variant="secondary" className="text-xs">No PPT</Badge>
                      )}
                      {project.reportUrl ? (
                        <Button variant="outline" size="sm" asChild>
                          <a href={project.reportUrl} target="_blank" rel="noopener noreferrer">
                            <Download className="mr-1 h-3 w-3" /> Report
                          </a>
                        </Button>
                      ) : (
                         <Badge variant="secondary" className="text-xs">No Report</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              {searchTerm ? `No approved projects match your search term "${searchTerm}".` : "No approved projects found."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
