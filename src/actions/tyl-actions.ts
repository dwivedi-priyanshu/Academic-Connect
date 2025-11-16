
'use server';

import { connectToDatabase } from '@/lib/mongodb';
import { MARKS_COLLECTION, STUDENT_PROFILES_COLLECTION, USERS_COLLECTION } from '@/lib/constants';
import type { Collection, Filter } from 'mongodb';
import type { SubjectMark, StudentProfile } from '@/types';
import { isTYLSubject, getTYLPassingMarks, TYL_TOTAL_MARKS } from '@/lib/tyl-config';
import { DEPARTMENTS } from '@/lib/subjects';

async function getMarksCollection(): Promise<Collection<SubjectMark>> {
  const { db } = await connectToDatabase();
  return db.collection<SubjectMark>(MARKS_COLLECTION);
}

async function getStudentProfilesCollection(): Promise<Collection<StudentProfile>> {
  const { db } = await connectToDatabase();
  return db.collection<StudentProfile>(STUDENT_PROFILES_COLLECTION);
}

async function getUsersCollection() {
  const { db } = await connectToDatabase();
  return db.collection(USERS_COLLECTION);
}

// Calculate total marks for a student in a TYL subject (IA1 + IA2)
function calculateTYLTotalMarks(mark: SubjectMark): number {
  const ia1 = typeof mark.ia1_50 === 'number' ? mark.ia1_50 : 0;
  const ia2 = typeof mark.ia2_50 === 'number' ? mark.ia2_50 : 0;
  return ia1 + ia2;
}

// Check if a student passed a TYL subject
function didStudentPassTYLSubject(mark: SubjectMark, subjectCode: string): boolean {
  const totalMarks = calculateTYLTotalMarks(mark);
  // Determine variant for core subjects
  let variant: 'odd' | 'full' | undefined = undefined;
  if (subjectCode.includes('-odd')) {
    variant = 'odd';
  } else if (subjectCode.includes('-full')) {
    variant = 'full';
  }
  const passingMarks = getTYLPassingMarks(subjectCode, variant);
  return totalMarks >= passingMarks;
}

// Interface for TYL analysis data
export interface TYLAnalysisData {
  department?: string;
  section?: string;
  year?: number;
  totalStudents: number;
  passedCounts: Record<string, number>; // subjectCode -> count of students who passed
  levelsReached?: {
    lx: number; // Language levels
    sx: number; // Soft skills levels
    ax: number; // Aptitude levels
    px: number; // Programming levels
  };
}

// Fetch all TYL marks for analysis
export async function fetchAllTYLMarksAction(
  filters?: {
    department?: string;
    section?: string;
    year?: number;
    semester?: number;
    includeAllSemesters?: boolean; // If true, don't filter by semester even if provided
  }
): Promise<Array<{ profile: StudentProfile; marks: SubjectMark[] }>> {
  try {
    const marksCollection = await getMarksCollection();
    const studentProfilesCollection = await getStudentProfilesCollection();
    const usersCollection = await getUsersCollection();

    // Get active students
    const activeStudentUsers = await usersCollection.find({ role: 'Student', status: 'Active' }).project({ id: 1 }).toArray();
    const activeStudentUserIds = activeStudentUsers
      .map(u => String(u.id || '').trim())
      .filter(id => id);

    if (activeStudentUserIds.length === 0) return [];

    // Build student profile query
    // IMPORTANT: Don't filter by currentSemester - we want to find students based on their department/section/year
    // regardless of their current semester, so we can see all their historical marks
    const profileQuery: Filter<StudentProfile> = {
      userId: { $in: activeStudentUserIds }
    };

    if (filters?.department) {
      profileQuery.department = filters.department;
    }
    if (filters?.section) {
      profileQuery.section = filters.section;
    }
    if (filters?.year) {
      profileQuery.year = filters.year;
    }
    // NOTE: We intentionally don't filter by currentSemester here
    // This allows us to see all marks for students even after they've been promoted

    const studentProfiles = await studentProfilesCollection.find(profileQuery).toArray();
    if (studentProfiles.length === 0) return [];

    const studentUserIds = studentProfiles
      .map(p => String(p.userId || '').trim())
      .filter(id => id);

    if (studentUserIds.length === 0) return [];

    // Fetch all TYL marks for these students
    const marksQuery: Filter<SubjectMark> = {
      studentId: { $in: studentUserIds }
    };

    // Only filter marks by semester if explicitly provided and not including all semesters
    if (filters?.semester && !filters?.includeAllSemesters) {
      marksQuery.semester = filters.semester;
    }

    const allMarks = await marksCollection.find(marksQuery).toArray();

    // Filter only TYL subjects
    const tylMarks = allMarks.filter(m => isTYLSubject(m.subjectCode));

    // Group marks by student
    const marksByStudent = new Map<string, SubjectMark[]>();
    tylMarks.forEach(mark => {
      const studentId = String(mark.studentId || '').trim();
      if (!marksByStudent.has(studentId)) {
        marksByStudent.set(studentId, []);
      }
      marksByStudent.get(studentId)!.push({
        ...mark,
        id: String(mark._id),
        _id: String(mark._id),
        studentId: studentId
      } as SubjectMark);
    });

    // Combine with profiles
    return studentProfiles.map(profile => {
      const profileId = String(profile.userId || '').trim();
      const { _id, ...rest } = profile;
      const profileWithId = { ...rest, id: String(_id), _id: String(_id), userId: profileId } as StudentProfile;
      return {
        profile: profileWithId,
        marks: marksByStudent.get(profileId) || []
      };
    });
  } catch (error) {
    console.error('Error fetching TYL marks:', error);
    throw new Error('Failed to fetch TYL marks data.');
  }
}

// Calculate TYL analysis data
// This function always includes all semesters to show complete historical data for each student
export async function calculateTYLAnalysisAction(
  filters?: {
    department?: string;
    section?: string;
    year?: number;
    semester?: number;
  }
): Promise<TYLAnalysisData> {
  try {
    // Always include all semesters for analysis - we want to see all marks for each student
    // regardless of when they were entered or what semester the student is currently in
    const data = await fetchAllTYLMarksAction({
      ...filters,
      includeAllSemesters: true,
    });
    
    const totalStudents = data.length;
    const passedCounts: Record<string, number> = {};

    // Initialize counts for all TYL subjects
    const tylSubjects = ['a1', 'a2', 'a3', 'a4', 'l1', 'l2', 'l3', 'l4', 's1', 's2', 's3', 's4', 'p1', 'p2', 'p3', 'p4', 'c2', 'c3', 'c4', 'c5'];
    tylSubjects.forEach(sub => {
      passedCounts[sub] = 0;
    });

    // Count students who passed each subject
    data.forEach(({ marks }) => {
      marks.forEach(mark => {
        const subjectCode = mark.subjectCode.toLowerCase();
        if (didStudentPassTYLSubject(mark, subjectCode)) {
          // Extract base code (e.g., 'a1', 'c2', 'p4')
          const baseCode = subjectCode.match(/^([a-z]\d)/)?.[1];
          
          if (baseCode) {
            // Count base code
            if (!passedCounts[baseCode]) {
              passedCounts[baseCode] = 0;
            }
            passedCounts[baseCode]++;
            
            // Handle variants for core subjects (c2-odd, c2-full, etc.)
            if (subjectCode.includes('-')) {
              const variantCode = subjectCode; // e.g., 'c2-odd', 'c2-full'
              if (!passedCounts[variantCode]) {
                passedCounts[variantCode] = 0;
              }
              passedCounts[variantCode]++;
            }
            
            // Handle P4 variants (p4-mad/fsd, p4-ds)
            if (baseCode === 'p4') {
              if (subjectCode.includes('mad') || subjectCode.includes('fsd')) {
                if (!passedCounts['p4-mad/fsd']) {
                  passedCounts['p4-mad/fsd'] = 0;
                }
                passedCounts['p4-mad/fsd']++;
              } else if (subjectCode.includes('ds')) {
                if (!passedCounts['p4-ds']) {
                  passedCounts['p4-ds'] = 0;
                }
                passedCounts['p4-ds']++;
              }
            }
          }
        }
      });
    });

    // Calculate levels reached (simplified - can be enhanced based on actual requirements)
    const levelsReached = {
      lx: 0, // Language levels
      sx: 0, // Soft skills levels
      ax: 0, // Aptitude levels
      px: 0, // Programming levels
    };

    // Count students who passed at least one subject in each category
    const languagePassed = new Set<string>();
    const softSkillsPassed = new Set<string>();
    const aptitudePassed = new Set<string>();
    const programmingPassed = new Set<string>();

    data.forEach(({ marks }) => {
      marks.forEach(mark => {
        const subjectCode = mark.subjectCode.toLowerCase();
        if (didStudentPassTYLSubject(mark, subjectCode)) {
          const studentId = String(mark.studentId || '').trim();
          if (subjectCode.startsWith('l')) {
            languagePassed.add(studentId);
          } else if (subjectCode.startsWith('s')) {
            softSkillsPassed.add(studentId);
          } else if (subjectCode.startsWith('a')) {
            aptitudePassed.add(studentId);
          } else if (subjectCode.startsWith('p')) {
            programmingPassed.add(studentId);
          }
        }
      });
    });

    levelsReached.lx = languagePassed.size;
    levelsReached.sx = softSkillsPassed.size;
    levelsReached.ax = aptitudePassed.size;
    levelsReached.px = programmingPassed.size;

    return {
      department: filters?.department,
      section: filters?.section,
      year: filters?.year,
      totalStudents,
      passedCounts,
      levelsReached,
    };
  } catch (error) {
    console.error('Error calculating TYL analysis:', error);
    throw new Error('Failed to calculate TYL analysis.');
  }
}

// Fetch raw TYL marks for display (no analysis)
// Returns all TYL marks grouped by student
// For raw marks, we want to show ALL marks across all semesters for each student
export async function fetchRawTYLMarksAction(
  filters?: {
    department?: string;
    section?: string;
    year?: number;
    semester?: number;
    subjectCode?: string;
  }
): Promise<Array<{
  profile: StudentProfile;
  marks: SubjectMark[];
}>> {
  try {
    // For raw marks view, always include all semesters so we can see historical marks
    // even after students have been promoted
    const data = await fetchAllTYLMarksAction({
      ...filters,
      includeAllSemesters: true, // Always fetch all semesters for raw marks
    });
    
    // If subjectCode filter is provided, filter marks
    if (filters?.subjectCode) {
      return data.map(({ profile, marks }) => ({
        profile,
        marks: marks.filter(m => m.subjectCode.toLowerCase() === filters.subjectCode!.toLowerCase())
      })).filter(item => item.marks.length > 0);
    }
    
    // Return all marks grouped by student
    return data;
  } catch (error) {
    console.error('Error fetching raw TYL marks:', error);
    throw new Error('Failed to fetch raw TYL marks.');
  }
}

