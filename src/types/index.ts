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
  admissionId: string; // This corresponds to USN in the Excel sheet
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
  id: string; // Composite key: studentId-subjectCode-semester
  studentId: string; // Link to student profile (userId)
  usn: string; // University Serial Number from Excel
  studentName: string; // Student Name from Excel
  subjectCode: string;
  subjectName: string;
  semester: number;
  credits?: number; // Credits might not be in the marks sheet, make optional
  ia1_50?: number | null; // IAT-1 score out of 50
  ia2_50?: number | null; // IAT-2 score out of 50
  assignment1_20?: number | null; // Assignment-1 score out of 20
  assignment2_20?: number | null; // Assignment-2 score out of 20
  // Add other relevant fields from Excel if needed, e.g., Final CIE, Practical
  // For now, focusing on IA1, IA2, Assignment1, Assignment2 as requested
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

// Mock student profiles for USN matching (add USNs from sample excel)
export const MOCK_STUDENT_PROFILES_WITH_USN: StudentProfile[] = [
    { userId: 'student001', admissionId: '1CR23IS068', fullName: 'ISHITA JAIN', dateOfBirth: '2002-05-10', contactNumber: '555-0101', address: '123 Main St', department: 'Computer Science', year: 3, section: 'A', parentName: 'Parent A', parentContact: '555-1111' },
    { userId: 'student002', admissionId: '1CR23IS069', fullName: 'J KESHAV', dateOfBirth: '2002-06-11', contactNumber: '555-0102', address: '456 Oak Ave', department: 'Computer Science', year: 3, section: 'A', parentName: 'Parent B', parentContact: '555-2222' },
    { userId: 'student003', admissionId: '1CR23IS070', fullName: 'jai shruthi n', dateOfBirth: '2002-07-12', contactNumber: '555-0103', address: '789 Pine Rd', department: 'Computer Science', year: 3, section: 'A', parentName: 'Parent C', parentContact: '555-3333' },
    { userId: 'student004', admissionId: '1CR23IS071', fullName: 'JAIDEEP SINGH', dateOfBirth: '2002-08-13', contactNumber: '555-0104', address: '101 Maple Dr', department: 'Computer Science', year: 3, section: 'A', parentName: 'Parent D', parentContact: '555-4444' },
     { userId: 'student005', admissionId: '1CR23IS072', fullName: 'JITIKA SAHA', dateOfBirth: '2002-09-14', contactNumber: '555-0105', address: '202 Birch Ln', department: 'Computer Science', year: 3, section: 'A', parentName: 'Parent E', parentContact: '555-5555' },
     // Add more students matching the USNs in the Excel as needed...
     // Make sure the semester/section also match where this data is used
     { userId: 'student006', admissionId: '1CR23IS073', fullName: 'K SAMARTH GOUDA', dateOfBirth: '2002-10-15', contactNumber: '555-0106', address: '303 Cedar Ct', department: 'Computer Science', year: 3, section: 'A', parentName: 'Parent F', parentContact: '555-6666' },
     { userId: 'student007', admissionId: '1CR23IS074', fullName: 'KAMPARA RAMA KRISHNA RITHVIK', dateOfBirth: '2002-11-16', contactNumber: '555-0107', address: '404 Elm Pl', department: 'Computer Science', year: 3, section: 'A', parentName: 'Parent G', parentContact: '555-7777' },
     { userId: 'student008', admissionId: '1CR23IS075', fullName: 'KANAHIYA BARAI', dateOfBirth: '2002-12-17', contactNumber: '555-0108', address: '505 Spruce Way', department: 'Computer Science', year: 3, section: 'A', parentName: 'Parent H', parentContact: '555-8888' },
     // ... add entries for all USNs present in the sample excel sheet
];

// Mock map for quick USN to userId lookup
export const USN_TO_USERID_MAP: Record<string, string> = MOCK_STUDENT_PROFILES_WITH_USN.reduce((acc, student) => {
    acc[student.admissionId] = student.userId;
    return acc;
}, {} as Record<string, string>);
