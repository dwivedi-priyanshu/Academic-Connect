'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import type { StudentProfile, SubjectMark } from '@/types'; // Assuming SubjectMark is defined
import { Edit3, UserCheck, Save, PlusCircle, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";

// Mock data
const MOCK_STUDENTS_FOR_FACULTY: StudentProfile[] = [
  { userId: 'student001', admissionId: 'S001', fullName: 'Alice Wonderland', department: 'Computer Science', year: 2, section: 'A', dateOfBirth: '', contactNumber: '', address: '', parentName: '', parentContact: '' },
  { userId: 'student005', admissionId: 'S005', fullName: 'Edward Scissorhands', department: 'Computer Science', year: 2, section: 'B', dateOfBirth: '', contactNumber: '', address: '', parentName: '', parentContact: '' },
];

const MOCK_SUBJECTS_FOR_CS_YEAR2: Partial<SubjectMark>[] = [
  { subjectCode: 'CS201', subjectName: 'Data Structures', semester: 3, credits: 4 },
  { subjectCode: 'CS202', subjectName: 'Discrete Mathematics', semester: 3, credits: 3 },
  { subjectCode: 'MA201', subjectName: 'Probability & Statistics', semester: 3, credits: 3 },
];


// Mock API functions
const fetchFacultyStudents = async (facultyId: string): Promise<StudentProfile[]> => {
  console.log(`Fetching students for faculty ${facultyId}`);
  await new Promise(resolve => setTimeout(resolve, 500));
  return MOCK_STUDENTS_FOR_FACULTY; // Filter based on faculty's courses/department
};

const fetchSubjectsForClass = async (department: string, year: number, section: string): Promise<Partial<SubjectMark>[]> => {
  console.log(`Fetching subjects for ${department} Year ${year} Section ${section}`);
  await new Promise(resolve => setTimeout(resolve, 300));
  if (department === 'Computer Science' && year === 2) {
    return MOCK_SUBJECTS_FOR_CS_YEAR2;
  }
  return [];
};

const fetchStudentMarksForSubject = async (studentId: string, subjectCode: string): Promise<SubjectMark | null> => {
    // Simulate fetching existing marks.
    console.log(`Fetching marks for ${studentId}, subject ${subjectCode}`);
    await new Promise(resolve => setTimeout(resolve, 200));
    const stored = localStorage.getItem(`marks-${studentId}-${subjectCode}`);
    return stored ? JSON.parse(stored) : null;
}

const saveStudentMarksBatch = async (marksToSave: SubjectMark[], facultyId: string): Promise<boolean> => {
  console.log('Saving marks batch:', marksToSave, 'by faculty:', facultyId);
  await new Promise(resolve => setTimeout(resolve, 1000));
  marksToSave.forEach(mark => {
      localStorage.setItem(`marks-${mark.studentId}-${mark.subjectCode}`, JSON.stringify(mark));
  });
  return true;
};


export default function MarksEntryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [subjects, setSubjects] = useState<Partial<SubjectMark>[]>([]);
  const [marksData, setMarksData] = useState<SubjectMark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && user.role === 'Faculty') {
      fetchFacultyStudents(user.id).then(data => {
        setStudents(data);
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (selectedStudent) {
      setIsLoading(true);
      fetchSubjectsForClass(selectedStudent.department, selectedStudent.year, selectedStudent.section)
        .then(async subjectList => {
          setSubjects(subjectList);
          const initialMarksPromises = subjectList.map(async sub => {
            const existingMark = await fetchStudentMarksForSubject(selectedStudent.userId, sub.subjectCode!);
            return existingMark || {
              id: `${selectedStudent.userId}-${sub.subjectCode}`, // Composite ID
              studentId: selectedStudent.userId,
              subjectCode: sub.subjectCode!,
              subjectName: sub.subjectName!,
              semester: sub.semester!,
              credits: sub.credits!,
              ia1: null, ia2: null, ia3: null, assignment: null,
            } as SubjectMark;
          });
          const initialMarks = await Promise.all(initialMarksPromises);
          setMarksData(initialMarks);
          setIsLoading(false);
        });
    } else {
      setSubjects([]);
      setMarksData([]);
    }
  }, [selectedStudent]);

  const handleStudentSelect = (studentId: string) => {
    const student = students.find(s => s.userId === studentId);
    setSelectedStudent(student || null);
  };

  const handleMarkChange = (subjectCode: string, field: keyof SubjectMark, value: string) => {
    const numericValue = value === '' ? null : parseInt(value, 10);
    // Validate marks (0-25 for IA, 0-10 for assignment typically)
    if (numericValue !== null && (numericValue < 0 || 
        (['ia1','ia2','ia3'].includes(field as string) && numericValue > 25) ||
        (field === 'assignment' && numericValue > 10))
    ) {
        toast({ title: "Invalid Mark", description: `Mark for ${field} must be within valid range.`, variant: "destructive" });
        return;
    }

    setMarksData(prev =>
      prev.map(mark =>
        mark.subjectCode === subjectCode ? { ...mark, [field]: numericValue } : mark
      )
    );
  };

  const handleSubmitMarks = async () => {
    if (!user || !selectedStudent || marksData.length === 0) return;
    setIsSubmitting(true);
    const success = await saveStudentMarksBatch(marksData, user.id);
    if (success) {
      toast({ title: "Marks Saved", description: `Marks for ${selectedStudent.fullName} have been successfully saved.`, className: "bg-success text-success-foreground" });
    } else {
      toast({ title: "Save Failed", description: "Could not save marks. Please try again.", variant: "destructive" });
    }
    setIsSubmitting(false);
  };
  
  if (!user || user.role !== 'Faculty') {
    return <p>Access denied. This page is for faculty members only.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center"><Edit3 className="mr-2 h-8 w-8 text-primary" /> Marks Entry</h1>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Select Student</CardTitle>
          <CardDescription>Choose a student to enter or update their marks.</CardDescription>
          <Select onValueChange={handleStudentSelect} disabled={isLoading}>
            <SelectTrigger className="w-full md:w-1/2 mt-2 bg-background">
              <SelectValue placeholder="Select a student..." />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Students</SelectLabel>
                {students.map(student => (
                  <SelectItem key={student.userId} value={student.userId}>
                    {student.fullName} ({student.admissionId}) - {student.department}, Year {student.year}, Sec {student.section}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </CardHeader>
        
        {selectedStudent && (
          <CardContent>
            <CardTitle className="text-xl mb-4">Entering Marks for: {selectedStudent.fullName}</CardTitle>
            {isLoading && marksData.length === 0 ? (
              <p>Loading subjects and marks...</p> // Skeleton for table rows
            ) : subjects.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject Code</TableHead>
                      <TableHead>Subject Name</TableHead>
                      <TableHead className="text-center">IA 1</TableHead>
                      <TableHead className="text-center">IA 2</TableHead>
                      <TableHead className="text-center">IA 3</TableHead>
                      <TableHead className="text-center">Assignment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {marksData.map((markEntry) => (
                      <TableRow key={markEntry.subjectCode}>
                        <TableCell>{markEntry.subjectCode}</TableCell>
                        <TableCell>{markEntry.subjectName}</TableCell>
                        {(['ia1', 'ia2', 'ia3', 'assignment'] as const).map(field => (
                          <TableCell key={field}>
                            <Input
                              type="number"
                              className="w-20 text-center mx-auto bg-background"
                              value={markEntry[field] === null ? '' : String(markEntry[field])}
                              onChange={(e) => handleMarkChange(markEntry.subjectCode, field, e.target.value)}
                              min="0"
                              max={field === 'assignment' ? "10" : "25"}
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-6 flex justify-end">
                  <Button onClick={handleSubmitMarks} disabled={isSubmitting || isLoading}>
                    <Save className="mr-2 h-4 w-4" /> {isSubmitting ? 'Saving...' : 'Save All Marks'}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No subjects found for this student's class, or an error occurred.</p>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
