
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
 * For this version, it primarily checks if a user with the given email and role exists.
 */
export async function loginUserAction(email: string, role: UserRole): Promise<User | null> {
  try {
    console.log(`Attempting login for email: ${email}, role: ${role}`);
    const usersCollection = await getUsersCollection();
    // In a real app, password would be checked here.
    // For now, we find a user by email and role.
    // Note: User IDs in the mock data (student123, faculty456, admin789) are stored as 'id' field, not '_id'.
    // If your DB uses MongoDB's _id, query would be on _id or a unique email field.
    // Assuming 'email' and 'role' are fields in your 'users' collection.
    const user = await usersCollection.findOne({ email: email.toLowerCase(), role: role });

    if (user) {
      console.log('User found:', user.id, user.role);
       // Ensure the returned user object has the 'id' field consistent with the User type
       // If MongoDB _id is the primary key, it should be mapped to 'id'.
       // The mock users have 'id' directly. If DB users use _id, map it.
       // For simplicity, assuming 'id' is a direct field or already mapped.
      return { ...user, id: user.id || user._id?.toHexString() } as User;
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
    // Assuming 'id' is the field used for lookup, matching User type.
    // If MongoDB _id is primary key, ensure userId passed is the string version of ObjectId.
    const user = await usersCollection.findOne({ id: userId });

    if (user) {
      // Map _id to id if necessary, ensure consistency with User type.
      return { ...user, id: user.id || user._id?.toHexString() } as User;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user for session:', error);
    throw new Error('Failed to fetch session user data.');
  }
}
