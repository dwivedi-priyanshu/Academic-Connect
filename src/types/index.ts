
export type UserRole = 'Student' | 'Faculty' | 'Admin';

export interface User {
  _id?: any; // MongoDB ObjectId string when fetched from DB
  id: string;  // Primary identifier used throughout the app. For Mongo, this will be _id.toHexString().
  email: string;
  name: string;
  role: UserRole;
  avatar?: string; 
  // password?: string; // In a real app, this would be a hashed password, not stored on client model
}

export interface StudentProfile {
  _id?: any; // MongoDB ObjectId string
  id: string; // This field will be mapped from _id for client-side use
  userId: string; // Links to User.id
  admissionId: string; // USN
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
  _id?: string; // In MongoDB, this will be the composite 'id' string.
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

// The following MOCK_USER constants are for reference or seeding the database.
// They are NOT used for active authentication by AuthContext anymore.
export const MOCK_USER_STUDENT_DATA: Omit<User, 'id' | '_id'> = {
  email: 'student@example.com',
  name: 'John Doe',
  role: 'Student',
  avatar: 'https://picsum.photos/seed/student123/100/100',
};

export const MOCK_USER_FACULTY_DATA: Omit<User, 'id' | '_id'> = {
  email: 'faculty@example.com',
  name: 'Dr. Jane Smith',
  role: 'Faculty',
  avatar: 'https://picsum.photos/seed/faculty456/100/100',
};

export const MOCK_USER_ADMIN_DATA: Omit<User, 'id' | '_id'> = {
  email: 'admin@example.com',
  name: 'Admin User',
  role: 'Admin',
  avatar: 'https://picsum.photos/seed/admin789/100/100',
};

// It's assumed the 'users' collection in MongoDB would contain user documents.
// Example structure for a user document in MongoDB (using 'id' as a unique string, could also be email):
// { id: "student123", email: "student@example.com", name: "John Doe", role: "Student", avatar: "...", hashedPassword: "..." }
// { id: "faculty456", email: "faculty@example.com", name: "Dr. Jane Smith", role: "Faculty", avatar: "...", hashedPassword: "..." }
// { id: "admin789", email: "admin@example.com", name: "Admin User", role: "Admin", avatar: "...", hashedPassword: "..." }

// Student profiles in `student_profiles` collection would link via `userId`.
// Example: { userId: "student123", admissionId: "1USN001", fullName: "John Doe", ... }
