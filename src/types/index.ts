
export type UserRole = 'Student' | 'Faculty' | 'Admin';

export interface User {
  id: string; // Corresponds to mock user IDs, and potentially primary key in 'users' collection if not using Mongo _id.
  _id?: string; // Optional: if fetched from MongoDB and we want to keep ObjectId string
  email: string;
  name: string;
  role: UserRole;
  avatar?: string; 
}

export interface StudentProfile {
  _id?: string; // MongoDB ObjectId string
  id?: string; // This field will be mapped from _id for client-side use
  userId: string; // Links to User.id
  admissionId: string; 
  fullName: string;
  dateOfBirth: string; 
  contactNumber: string;
  address: string;
  department: string;
  year: number; 
  section: string; 
  parentName: string;
  parentContact: string;
}

export interface SubjectMark {
  _id?: string; // MongoDB ObjectId string (if we don't use composite key as _id) or the composite string key itself
  id: string; // Composite key: studentId-subjectCode-semester. This WILL be used as _id in MongoDB for marks.
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
  _id: any; // MongoDB ObjectId, will be mapped to string 'id'
  id: string;
  studentId: string;
  title: string;
  description: string;
  pptUrl?: string; 
  reportUrl?: string; 
  submittedDate: string; 
  status: SubmissionStatus;
  facultyId?: string; 
  remarks?: string;
  subject: string; 
}

export interface MoocCourse {
  _id: any; // MongoDB ObjectId, will be mapped to string 'id'
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
}

// Sample data for demonstration (used by AuthContext for mock login)
export const MOCK_USER_STUDENT: User = {
  id: 'student123', // This ID should exist in 'users' collection and link to a 'student_profiles' entry
  email: 'student@example.com',
  name: 'John Doe',
  role: 'Student',
  avatar: 'https://picsum.photos/seed/student123/100/100',
};

export const MOCK_USER_FACULTY: User = {
  id: 'faculty456', // This ID should exist in 'users' collection
  email: 'faculty@example.com',
  name: 'Dr. Jane Smith',
  role: 'Faculty',
  avatar: 'https://picsum.photos/seed/faculty456/100/100',
};

export const MOCK_USER_ADMIN: User = {
  id: 'admin789', // This ID should exist in 'users' collection
  email: 'admin@example.com',
  name: 'Admin User',
  role: 'Admin',
  avatar: 'https://picsum.photos/seed/admin789/100/100',
};

// MOCK_STUDENT_PROFILES_WITH_USN and USN_TO_USERID_MAP are no longer primary sources of truth.
// Student data for marks upload will be fetched from the student_profiles collection in MongoDB.
// It's assumed these profiles will be seeded/created in the DB.
// For the application to function correctly, the `users` collection should contain entries for
// MOCK_USER_STUDENT, MOCK_USER_FACULTY, MOCK_USER_ADMIN.
// And `student_profiles` collection should contain profiles for students, especially those whose marks
// will be uploaded, linking via `userId` to the `users` collection and having correct `admissionId` (USN).
