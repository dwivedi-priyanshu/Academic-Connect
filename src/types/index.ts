

export type UserRole = 'Student' | 'Faculty' | 'Admin';
export type UserStatus = 'PendingApproval' | 'Active' | 'Rejected' | 'Disabled';

export interface User {
  _id?: any; 
  id: string;  
  email: string;
  name: string;
  role: UserRole;
  avatar?: string; 
  status: UserStatus; 
}

export interface StudentProfile {
  _id?: any; 
  id: string; 
  userId: string; 
  admissionId: string; 
  fullName: string;
  dateOfBirth: string; 
  contactNumber: string;
  address: string;
  department: string;
  year: number; 
  currentSemester: number; 
  section: string; 
  parentName: string; 
  parentContact: string;
  fatherName?: string;
  motherName?: string;
  gender?: 'Male' | 'Female' | 'Other' | '';
  bloodGroup?: string;
  aadharNumber?: string;
  category?: string; 
  religion?: string;
  nationality?: string;
  sslcMarks?: string; 
  pucMarks?: string;  
  avatar?: string; 
}

export interface SubjectMark {
  _id?: string; 
  id: string; 
  studentId: string; 
  usn: string; 
  studentName: string; 
  subjectCode: string;
  subjectName: string;
  semester: number;
  credits?: number; 
  ia1_50?: number | null;
  ia2_50?: number | null; 
  assignment1_20?: number | null;
  assignment2_20?: number | null;
}

export type SubmissionStatus = 'Pending' | 'Approved' | 'Rejected';

export interface MiniProject {
  _id: any; 
  id: string;
  studentId: string;
  title: string;
  description: string;
  pptUrl?: string; 
  reportUrl?: string; 
  submittedDate: string; 
  status: SubmissionStatus;
  facultyId?: string; // ID of faculty who actioned (approved/rejected)
  remarks?: string;
  subject: string;
  guideId?: string; // ID of faculty chosen by student as guide
  submissionSemester: number; 
  studentName?: string; // Populated for display
  guideName?: string; // Populated for display
}

export interface MoocCourse {
  _id: any; 
  id:string;
  studentId: string;
  courseName: string;
  platform: string; 
  startDate: string; 
  endDate: string; 
  certificateUrl?: string; 
  creditsEarned?: number;
  submittedDate: string; 
  status: SubmissionStatus;
  facultyId?: string; 
  remarks?: string;
  submissionSemester: number; 
}

export interface MoocCourseWithStudentInfo extends MoocCourse {
  studentName: string;
  studentSemester: number; 
}


export interface FacultySubjectAssignment {
  _id?: any;
  id: string;
  facultyId: string; 
  facultyName?: string; 
  subjectCode: string;
  subjectName: string; 
  semester: number;
  section: string;
}

export interface MoocCoordinatorAssignment {
  _id?: any;
  id: string;
  facultyId: string; 
  facultyName?: string; 
  semester: number; 
}

// For Class Performance Page
export interface StudentClassPerformanceDetails {
  profile: StudentProfile;
  marksBySubject: Record<string, SubjectMark | undefined>; // Keyed by subjectCode
}


export const MOCK_USER_STUDENT_DATA: Omit<User, 'id' | '_id' | 'status'> = {
  email: 'student@example.com',
  name: 'John Doe',
  role: 'Student',
  avatar: 'https://picsum.photos/seed/student123/100/100',
};

export const MOCK_USER_FACULTY_DATA: Omit<User, 'id' | '_id' | 'status'> = {
  email: 'faculty@example.com',
  name: 'Dr. Jane Smith',
  role: 'Faculty',
  avatar: 'https://picsum.photos/seed/faculty456/100/100',
};

export const MOCK_USER_ADMIN_DATA: Omit<User, 'id' | '_id' | 'status'> = {
  email: 'admin@example.com',
  name: 'Admin User',
  role: 'Admin',
  avatar: 'https://picsum.photos/seed/admin789/100/100',
};
