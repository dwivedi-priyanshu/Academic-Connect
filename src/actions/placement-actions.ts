
'use server';

import type { PlacementDrive, PlacementOffer } from '@/types';
import { format } from 'date-fns';

// --- MOCK DATA ---
const MOCK_PLACEMENT_DRIVES: PlacementDrive[] = [
  {
    id: 'drive1',
    companyName: 'Tech Solutions Inc.',
    driveDate: new Date(2024, 7, 15).toISOString(), // Aug 15, 2024
    role: 'Software Engineer Trainee',
    description: 'Hiring for fresh graduates for full-stack development roles. Eligibility: CSE/ISE, >7 CGPA.',
    ctcRange: '6-8 LPA',
  },
  {
    id: 'drive2',
    companyName: 'Innovate Corp',
    driveDate: new Date(2024, 8, 5).toISOString(), // Sep 5, 2024
    role: 'Data Analyst Intern',
    description: 'Internship opportunity for final year students. Strong analytical skills required.',
    ctcRange: '25-30k/month stipend',
  },
  {
    id: 'drive3',
    companyName: 'Global Connect Ltd.',
    driveDate: new Date(2024, 6, 20).toISOString(), // July 20, 2024
    role: 'Associate Consultant',
    description: 'Drive for all branches. Good communication and problem-solving skills needed.',
    ctcRange: '5-7 LPA',
  },
];

const MOCK_PLACEMENT_OFFERS: PlacementOffer[] = [
  {
    id: 'offer1',
    studentId: 'teststudent-id', // Assuming a test student ID, replace with actual logic
    driveId: 'drive1',
    companyName: 'Tech Solutions Inc.',
    role: 'Software Engineer Trainee',
    ctcOffered: '7.5 LPA',
    offerDate: new Date(2024, 7, 25).toISOString(), // Aug 25, 2024
    status: 'Accepted',
    offerLetterUrl: 'https://placehold.co/800x1100.pdf?text=Offer+Letter+Tech+Solutions',
    remarks: 'Successfully cleared all rounds.',
  },
  {
    id: 'offer2',
    studentId: 'teststudent-id',
    driveId: 'drive3',
    companyName: 'Global Connect Ltd.',
    role: 'Associate Consultant',
    ctcOffered: '6 LPA',
    offerDate: new Date(2024, 6, 30).toISOString(), // July 30, 2024
    status: 'Offered',
    remarks: 'Awaiting student decision.',
  },
];

// --- Placeholder Server Actions ---

export async function fetchStudentPlacementDrivesAction(studentId: string): Promise<PlacementDrive[]> {
  console.log(`[PlacementAction] Fetching placement drives for student: ${studentId}`);
  // In a real app, you would filter drives the student participated in.
  // For now, returning all mock drives.
  await new Promise(resolve => setTimeout(resolve, 700)); // Simulate network delay
  return MOCK_PLACEMENT_DRIVES.map(drive => ({
      ...drive,
      driveDate: format(new Date(drive.driveDate), 'PPP') // Format date for display
  }));
}

export async function fetchStudentPlacementOffersAction(studentId: string): Promise<PlacementOffer[]> {
  console.log(`[PlacementAction] Fetching placement offers for student: ${studentId}`);
  // Filter mock offers by studentId (or use a specific student's mock offers)
  const studentOffers = MOCK_PLACEMENT_OFFERS.filter(offer => offer.studentId === studentId || offer.studentId === 'teststudent-id');
  await new Promise(resolve => setTimeout(resolve, 700)); // Simulate network delay
  return studentOffers.map(offer => ({
      ...offer,
      offerDate: format(new Date(offer.offerDate), 'PPP') // Format date for display
  }));
}

// Placeholder for submitting/updating offer status by student
export async function updatePlacementOfferStatusAction(offerId: string, newStatus: 'Accepted' | 'Rejected'): Promise<boolean> {
  console.log(`[PlacementAction] Student updating offer ${offerId} to status ${newStatus}`);
  // In a real app, find the offer by ID and update its status in the database.
  const offerIndex = MOCK_PLACEMENT_OFFERS.findIndex(o => o.id === offerId);
  if (offerIndex !== -1) {
    MOCK_PLACEMENT_OFFERS[offerIndex].status = newStatus;
    await new Promise(resolve => setTimeout(resolve, 500));
    return true;
  }
  return false;
}
