
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
  fileName: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        public_id: fileName.substring(0, fileName.lastIndexOf('.')), // Use filename without extension as public_id
        resource_type: 'auto', // auto-detects image or raw for PDFs
        overwrite: true,
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
