'use server';

import { connectToDatabase } from '@/lib/mongodb';
import { MARKS_COLLECTION } from '@/lib/constants';
import type { SubjectMark } from '@/types';
import type { Collection } from 'mongodb';

async function getMarksCollection(): Promise<Collection<SubjectMark>> {
  const { db } = await connectToDatabase();
  return db.collection<SubjectMark>(MARKS_COLLECTION);
}

export async function fetchStudentMarksAction(studentId: string, semester: number): Promise<SubjectMark[]> {
  try {
    console.log(`Fetching marks from DB for student ${studentId}, semester ${semester}`);
    const marksCollection = await getMarksCollection();
    
    const query = { studentId, semester };
    const studentMarksCursor = marksCollection.find(query);
    const studentMarksArray = await studentMarksCursor.toArray();
    
    // In MARKS_COLLECTION, _id is already a string (composite key: studentId-subjectCode-semester)
    // and it is also stored as 'id'.
    return studentMarksArray.map(doc => {
      const { _id, ...rest } = doc as any; 
      // Ensure both id and _id are the string from the database _id field
      return { ...rest, id: _id, _id: _id } as SubjectMark; 
    });
  } catch (error) {
    console.error(`Error fetching marks for student ${studentId}, semester ${semester}:`, error);
    throw new Error('Failed to fetch student marks.');
  }
}