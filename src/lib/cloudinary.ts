
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
  folderPath: string, // Renamed to folderPath for clarity
  fileName: string, // This is the safeFileName (e.g., "report.pdf" or "image.png")
  resourceType: 'image' | 'raw' | 'video' | 'auto' = 'auto'
): Promise<string> {
  return new Promise((resolve, reject) => {
    let uploadOptions: cloudinary.UploadApiOptions;

    const dotIndex = fileName.lastIndexOf('.');
    const baseName = dotIndex !== -1 ? fileName.substring(0, dotIndex) : fileName;
    const extension = dotIndex !== -1 ? fileName.substring(dotIndex + 1).toLowerCase() : '';

    if (resourceType === 'raw') {
      // For 'raw' files, combine folderPath and fileName into the public_id.
      // Do not use the 'folder' option separately for raw uploads with a full path in public_id.
      uploadOptions = {
        resource_type: 'raw',
        overwrite: true,
        public_id: `${folderPath}/${fileName}`, // e.g., "mooc_certificates/student123/mydoc.pdf"
      };
    } else {
      // For 'image', 'video', 'auto' resource types
      uploadOptions = {
        resource_type: resourceType,
        folder: folderPath, // Use folder option here
        overwrite: true,
        public_id: baseName, // e.g., "my_image" (without extension)
      };
      if (extension) {
        uploadOptions.format = extension; // e.g., "png"
      }
    }
    
    const finalPublicIdForLog = uploadOptions.public_id;
    const finalFolderForLog = uploadOptions.folder; // This will be undefined for raw uploads now
    const finalFormatForLog = uploadOptions.format;

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('Cloudinary Upload Error:', error);
          console.error('Upload Options used:', { folder: finalFolderForLog, public_id: finalPublicIdForLog, resource_type: uploadOptions.resource_type, format: finalFormatForLog });
          reject(error);
        } else if (result) {
          if (resourceType === 'raw' && result.resource_type !== 'raw') {
            console.warn(`Cloudinary Warning: Expected 'raw' resource_type, but received '${result.resource_type}'. URL: ${result.secure_url}`);
          }
          resolve(result.secure_url);
        } else {
          reject(new Error('Cloudinary upload failed without error object'));
        }
      }
    );
    uploadStream.end(fileBuffer);
  });
}

