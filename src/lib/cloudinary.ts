
// src/lib/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary';
import type { Readable } from 'stream';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function uploadStreamToCloudinary(
  fileBuffer: Buffer,
  folder: string,
  fileName: string,
  resourceType: 'image' | 'raw' | 'video' | 'auto' = 'auto' // Added resourceType parameter
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Ensure public_id does not include the extension for 'raw' files if Cloudinary handles it by format
    // For 'raw' files, often better to let Cloudinary append format or use it in URL, not in public_id
    const dotIndex = fileName.lastIndexOf('.');
    const publicIdBase = dotIndex === -1 ? fileName : fileName.substring(0, dotIndex);

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        public_id: publicIdBase,
        resource_type: resourceType, 
        overwrite: true,
        format: resourceType === 'raw' && dotIndex !== -1 ? fileName.substring(dotIndex + 1) : undefined, // Explicitly set format for raw if needed
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary Upload Error:', error);
          reject(error);
        } else if (result) {
          resolve(result.secure_url);
        } else {
          reject(new Error('Cloudinary upload failed without error object'));
        }
      }
    );
    uploadStream.end(fileBuffer);
  });
}

