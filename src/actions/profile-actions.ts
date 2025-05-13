
'use server';

import { connectToDatabase } from '@/lib/mongodb';
import { USERS_COLLECTION, STUDENT_PROFILES_COLLECTION, mapMongoId } from '@/lib/constants';
import type { User, StudentProfile } from '@/types';
import type { Collection } from 'mongodb';
import { ObjectId } from 'mongodb';

async function getUsersCollection(): Promise<Collection<User>> {
  const { db } = await connectToDatabase();
  return db.collection<User>(USERS_COLLECTION);
}

async function getStudentProfilesCollection(): Promise<Collection<StudentProfile>> {
  const { db } = await connectToDatabase();
  return db.collection<StudentProfile>(STUDENT_PROFILES_COLLECTION);
}

export async function fetchUserProfileDataAction(userId: string): Promise<User | null> {
  try {
    const usersCollection = await getUsersCollection();
    const userDoc = await usersCollection.findOne({ id: userId }); // Assuming User has 'id' not '_id' from mock
    if (!userDoc) return null;
    // For this mock setup, User object doesn't use MongoDB _id, it uses the mock id.
    return userDoc;
  } catch (error) {
    console.error('Error fetching user profile data:', error);
    throw new Error('Failed to fetch user profile data.');
  }
}

export async function fetchStudentFullProfileDataAction(userId: string): Promise<StudentProfile | null> {
  try {
    const studentProfilesCollection = await getStudentProfilesCollection();
    // StudentProfile's main identifier for linking is userId. _id is mongo's internal.
    const profileDoc = await studentProfilesCollection.findOne({ userId: userId });
    if (!profileDoc) return null;
    return { ...profileDoc, id: profileDoc._id.toHexString() } as unknown as StudentProfile; // Map _id to id for consistency if StudentProfile type expects 'id' field from mongo
  } catch (error) {
    console.error('Error fetching student detailed profile data:', error);
    throw new Error('Failed to fetch student detailed profile data.');
  }
}


export async function saveStudentProfileDataAction(profileData: StudentProfile): Promise<boolean> {
  try {
    const studentProfilesCollection = await getStudentProfilesCollection();
    const { userId, ...dataToSave } = profileData;

    // Upsert based on userId. This means if a profile for this userId exists, it's updated. Otherwise, it's inserted.
    const result = await studentProfilesCollection.updateOne(
      { userId: userId },
      { $set: dataToSave },
      { upsert: true }
    );
    return result.modifiedCount === 1 || result.upsertedCount === 1;
  } catch (error) {
    console.error('Error saving student profile data:', error);
    throw new Error('Failed to save student profile data.');
  }
}

// Placeholder for saving general user data if needed (e.g. faculty name update)
// This would update the 'users' collection.
export async function saveUserGeneralDataAction(userData: User): Promise<boolean> {
     try {
        const usersCollection = await getUsersCollection();
        // Assuming 'id' is the unique identifier for User objects from the mock.
        // In a real system with MongoDB, you'd likely use _id.
        const result = await usersCollection.updateOne(
            { id: userData.id }, 
            { $set: { name: userData.name, email: userData.email, avatar: userData.avatar } }, // Only update specific fields
            { upsert: false } // Don't upsert, user should exist
        );
        return result.modifiedCount === 1;
    } catch (error) {
        console.error('Error saving user general data:', error);
        throw new Error('Failed to save user data.');
    }
}


// Action for faculty to fetch a list of students
// Potentially filtered by department, year, section if faculty is associated with them.
// For now, a simplified version that might fetch students based on some criteria or all.
export async function fetchStudentsForFacultyAction(
  facultyId: string, // To determine which students this faculty can see
  filters?: { year?: number; section?: string; department?: string; }
): Promise<StudentProfile[]> {
  try {
    const studentProfilesCollection = await getStudentProfilesCollection();
    // Example: Simple filter, in real app, this would be more complex based on faculty's associations
    const query: Partial<StudentProfile> = {};
    if (filters?.department) query.department = filters.department;
    if (filters?.year) query.year = filters.year;
    if (filters?.section) query.section = filters.section;

    const studentsCursor = studentProfilesCollection.find(query);
    const studentsArray = await studentsCursor.toArray();
    return studentsArray.map(s => ({ ...s, id: s._id.toHexString() } as unknown as StudentProfile));
  } catch (error) {
    console.error('Error fetching students for faculty:', error);
    throw new Error('Failed to fetch students.');
  }
}

// Action for admin to fetch all users
export async function fetchAllUsersAction(): Promise<User[]> {
  try {
    const usersCollection = await getUsersCollection();
    // Assuming User objects in DB have 'id' field as per mock structure.
    // If User objects use MongoDB's _id, then mapping would be needed.
    // For this simplified setup, we assume 'id' field exists and is queryable.
    const usersArray = await usersCollection.find({}).toArray();
    // No _id to id mapping needed here if User type expects 'id' and DB stores it as 'id'.
    return usersArray;
  } catch (error) {
    console.error('Error fetching all users:', error);
    throw new Error('Failed to fetch all users.');
  }
}
