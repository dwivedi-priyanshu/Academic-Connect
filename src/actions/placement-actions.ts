
'use server';

import type { PlacementEntry } from '@/types';
import { connectToDatabase } from '@/lib/mongodb';
import { PLACEMENTS_COLLECTION } from '@/lib/constants';
import type { Collection, Filter } from 'mongodb';
import { ObjectId } from 'mongodb';
import { uploadStreamToCloudinary } from '@/lib/cloudinary';

async function getPlacementsCollection(): Promise<Collection<PlacementEntry>> {
  const { db } = await connectToDatabase();
  return db.collection<PlacementEntry>(PLACEMENTS_COLLECTION);
}

export async function fetchStudentPlacementsAction(studentId: string): Promise<PlacementEntry[]> {
  try {
    const placementsCollection = await getPlacementsCollection();
    const query: Filter<PlacementEntry> = { studentId };
    const placementsCursor = placementsCollection.find(query).sort({ submittedDate: -1 }); // Sort by newest first
    const placementsArray = await placementsCursor.toArray();
    return placementsArray.map(placement => {
        const idStr = placement._id.toHexString();
        const { _id, ...rest } = placement;
        return { ...rest, id: idStr, _id: idStr } as PlacementEntry;
    });
  } catch (error) {
    console.error('Error fetching student placements:', error);
    throw new Error('Failed to fetch placement entries.');
  }
}

export async function saveStudentPlacementAction(formData: FormData, studentId: string): Promise<PlacementEntry> {
  try {
    const placementsCollection = await getPlacementsCollection();
    let savedPlacement: PlacementEntry;

    const id = formData.get('id') as string | undefined;
    const companyName = formData.get('companyName') as string;
    const ctcOffered = formData.get('ctcOffered') as string;
    let existingOfferLetterUrl = formData.get('existingOfferLetterUrl') as string | undefined;

    if (existingOfferLetterUrl === 'undefined' || existingOfferLetterUrl === 'null') {
        existingOfferLetterUrl = undefined;
    }

    const offerLetterFile = formData.get('offerLetterFile') as File | null;
    let offerLetterCloudUrl: string | undefined = existingOfferLetterUrl;

    if (offerLetterFile && offerLetterFile.size > 0) {
      const fileBuffer = Buffer.from(await offerLetterFile.arrayBuffer());
      const originalFileName = offerLetterFile.name;
      const safeFileName = originalFileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const safeCompanyName = companyName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const resourceTypeForOfferLetter = (offerLetterFile.type === 'application/pdf' || offerLetterFile.name.toLowerCase().endsWith('.pdf')) ? 'raw' : 'auto';
      offerLetterCloudUrl = await uploadStreamToCloudinary(fileBuffer, `placement_offers/${studentId}/${safeCompanyName}`, safeFileName, resourceTypeForOfferLetter);
    }

    const placementData: Omit<PlacementEntry, 'id' | '_id' | 'submittedDate'> & { studentId: string; offerLetterUrl?: string } = {
      studentId,
      companyName,
      ctcOffered,
      offerLetterUrl: offerLetterCloudUrl,
    };

    if (id && id !== 'new') {
      const dataToUpdate = { ...placementData };
      delete (dataToUpdate as any).studentId; 
      delete (dataToUpdate as any).submittedDate;

      const result = await placementsCollection.findOneAndUpdate(
        { _id: new ObjectId(id), studentId },
        { $set: dataToUpdate },
        { returnDocument: 'after' }
      );
      if (!result) throw new Error('Placement entry not found or access denied.');
      const updatedDoc = result as PlacementEntry; 
      const idStr = updatedDoc._id.toHexString();
      const { _id, ...rest } = updatedDoc;
      savedPlacement = { ...rest, id: idStr, _id: idStr } as PlacementEntry;
    } else {
      const newPlacementInternal: Omit<PlacementEntry, 'id' | '_id'> = {
        ...placementData,
        submittedDate: new Date().toISOString(),
      };
      const result = await placementsCollection.insertOne(newPlacementInternal as PlacementEntry);
      const insertedIdStr = result.insertedId.toHexString();
      savedPlacement = { ...newPlacementInternal, id: insertedIdStr, _id: insertedIdStr } as PlacementEntry;
    }
    return savedPlacement;
  } catch (error) {
    console.error('Error saving placement entry:', error); 
    let errorMessage = 'Failed to save placement entry.';
    if (error instanceof Error && error.message) {
      errorMessage += ` Details: ${error.message}`;
    }
    throw new Error(errorMessage); 
  }
}

export async function deleteStudentPlacementAction(placementId: string, studentId: string): Promise<boolean> {
  try {
    const placementsCollection = await getPlacementsCollection();
    const result = await placementsCollection.deleteOne({ _id: new ObjectId(placementId), studentId });
    return result.deletedCount === 1;
  } catch (error) {
    console.error('Error deleting placement entry:', error);
    throw new Error('Failed to delete placement entry.');
  }
}
