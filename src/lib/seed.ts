'use server'; // Required for actions, though this is a script, actions are imported.

import type { MongoClient } from 'mongodb';
import { createUserAction } from '@/actions/profile-actions';
import { connectToDatabase } from './mongodb';

async function seedDatabase() {
  let mongoClientInstance: MongoClient | null = null;
  try {
    const { client: connectedClient } = await connectToDatabase();
    mongoClientInstance = connectedClient;
    console.log('Connected to database for seeding.');

    const studentEmail = 'teststudent@gmail.com'; // Normalized to lowercase by createUserAction
    const studentName = 'Test Student';
    const studentRole = 'Student';

    console.log(`Attempting to create user: ${studentName} (${studentEmail}) with role ${studentRole}`);

    // Check if user already exists to avoid duplicate profile creation issues if seed is run multiple times
    // createUserAction itself has a check, but an explicit one here can be clearer for seeding
    const usersCollection = (await connectToDatabase()).db.collection('users');
    const existingUser = await usersCollection.findOne({ email: studentEmail.toLowerCase() });

    if (existingUser) {
      console.log(`User with email ${studentEmail} already exists. Skipping creation.`);
    } else {
      const result = await createUserAction(
        { email: studentEmail, name: studentName, role: studentRole },
        {
          admissionId: `TEST${Date.now().toString().slice(-8)}`, // Generate a unique-ish admissionId
          fullName: studentName, // Ensure fullName is passed
          department: 'Computer Science', // Example department
          year: 1, // Example year
          section: 'A', // Example section
          // Other fields will get defaults from createUserAction or can be added here
        }
      );

      if (result && result.user) {
        console.log(`User ${result.user.name} created successfully with ID: ${result.user.id}`);
        if (result.studentProfile) {
          console.log(`Student profile created successfully with ID: ${result.studentProfile.id}`);
        }
      } else {
        // This case might be hit if createUserAction returns null due to its internal existing user check
        // which might have run if our explicit check was not present or if there's another issue.
        console.log(`User with email ${studentEmail} might already exist or creation failed (createUserAction returned null).`);
      }
    }

  } catch (error) {
    console.error('Error during database seeding:', error);
    if (mongoClientInstance) {
      await mongoClientInstance.close();
      console.log('MongoDB connection closed due to error.');
    }
    process.exit(1); // Exit with error code if seeding fails
  } finally {
    if (mongoClientInstance) {
      await mongoClientInstance.close();
      console.log('MongoDB connection closed.');
    }
    console.log('Seeding process finished.');
  }
}

// Allows running this script directly using `node src/lib/seed.js` (after tsc) or `tsx src/lib/seed.ts`
if (require.main === module) {
  seedDatabase().then(() => {
    console.log('Seed script completed successfully.');
    process.exit(0); 
  }).catch(err => {
    console.error("Unhandled error during seed script execution:", err);
    process.exit(1);
  });
}

export default seedDatabase;