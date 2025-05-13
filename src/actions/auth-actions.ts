'use server';

import { connectToDatabase } from '@/lib/mongodb';
import { USERS_COLLECTION } from '@/lib/constants';
import type { User, UserRole } from '@/types';
import type { Collection } from 'mongodb';

async function getUsersCollection(): Promise<Collection<User>> {
  const { db } = await connectToDatabase();
  return db.collection<User>(USERS_COLLECTION);
}

/**
 * Attempts to log in a user by finding a match for email and role.
 * In a real production app, this would also involve password verification (e.g., hashing).
 * For this version, it primarily checks if a user with the given email (case-insensitive) and role exists.
 */
export async function loginUserAction(email: string, role: UserRole): Promise<User | null> {
  try {
    console.log(`Attempting login for email: ${email}, role: ${role}`);
    const usersCollection = await getUsersCollection();
    // Password check is currently omitted.
    // Find user by lowercase email and role.
    const userDocument = await usersCollection.findOne({ email: email.toLowerCase(), role: role });

    if (userDocument) {
      console.log('User found:', userDocument.id, userDocument.role);
       // Ensure the returned user object has the 'id' field consistent with the User type
       // User documents in DB store 'id' as the string representation of _id.
      return { 
        id: userDocument.id, // This should be the string version of _id
        email: userDocument.email,
        name: userDocument.name,
        role: userDocument.role,
        avatar: userDocument.avatar,
        // _id: userDocument._id // Optionally include if needed elsewhere, but User type doesn't mandate it
      } as User;
    }
    console.log('User not found or role mismatch for:', email, role);
    return null;
  } catch (error) {
    console.error('Error during login user action:', error);
    throw new Error('Login failed due to a server error.');
  }
}

/**
 * Fetches user details for an active session using userId.
 */
export async function fetchUserForSessionAction(userId: string): Promise<User | null> {
  try {
    const usersCollection = await getUsersCollection();
    // User documents use 'id' field (string version of _id) for lookup.
    const userDocument = await usersCollection.findOne({ id: userId });

    if (userDocument) {
      // Map _id to id if necessary, ensure consistency with User type.
      return { 
        id: userDocument.id,
        email: userDocument.email,
        name: userDocument.name,
        role: userDocument.role,
        avatar: userDocument.avatar
      } as User;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user for session:', error);
    throw new Error('Failed to fetch session user data.');
  }
}