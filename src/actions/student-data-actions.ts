
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
    
    // Assuming SubjectMark 'id' is the composite key, which is used as _id in DB
    return studentMarksArray.map(doc => {
      const { _id, ...rest } = doc as any; // Cast to any to handle _id
      return { ...rest, id: _id } as SubjectMark; 
    });
  } catch (error) {
    console.error(`Error fetching marks for student ${studentId}, semester ${semester}:`, error);
    throw new Error('Failed to fetch student marks.');
  }
}
