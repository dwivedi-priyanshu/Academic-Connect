export type UserRole = 'Student' | 'Faculty' | 'Admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string; // URL to avatar image
}

export interface StudentProfile {
  userId: string;
  admissionId: string;
  fullName: string;
  dateOfBirth: string; // ISO string
  contactNumber: string;
  address: string;
  department: string;
  year: number; // e.g., 1, 2, 3, 4
  section: string; // e.g., 'A', 'B'
  parentName: string;
  parentContact: string;
}

export interface SubjectMark {
  id: string;
  subjectName: string;
  subjectCode: string;
  ia1?: number | null;
  ia2?: number | null;
  ia3?: number | null;
  assignment?: number | null;
  semester: number;
  credits: number;
}

export type SubmissionStatus = 'Pending' | 'Approved' | 'Rejected';

export interface MiniProject {
  id: string;
  studentId: string;
  title: string;
  description: string;
  pptUrl?: string; // Mock: stores filename or path
  reportUrl?: string; // Mock: stores filename or path
  submittedDate: string; // ISO string
  status: SubmissionStatus;
  facultyId?: string; // ID of faculty who approved/rejected
  remarks?: string;
  subject: string; // Associated subject
}

export interface MoocCourse {
  id:string;
  studentId: string;
  courseName: string;
  platform: string; // e.g., Coursera, Udemy, NPTEL
  startDate: string; // ISO string
  endDate: string; // ISO string
  certificateUrl?: string; // Mock: stores filename or path
  creditsEarned?: number;
  submittedDate: string; // ISO string
  status: SubmissionStatus;
  facultyId?: string;
  remarks?: string;
}

// Sample data for demonstration
export const MOCK_USER_STUDENT: User = {
  id: 'student123',
  email: 'student@example.com',
  name: 'John Doe',
  role: 'Student',
  avatar: 'https://picsum.photos/seed/student123/100/100',
};

export const MOCK_USER_FACULTY: User = {
  id: 'faculty456',
  email: 'faculty@example.com',
  name: 'Dr. Jane Smith',
  role: 'Faculty',
  avatar: 'https://picsum.photos/seed/faculty456/100/100',
};

export const MOCK_USER_ADMIN: User = {
  id: 'admin789',
  email: 'admin@example.com',
  name: 'Admin User',
  role: 'Admin',
  avatar: 'https://picsum.photos/seed/admin789/100/100',
};
