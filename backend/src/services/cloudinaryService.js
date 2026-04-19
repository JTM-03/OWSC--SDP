const cloudinary = require('cloudinary').v2;
const fs = require('fs');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload a file to Cloudinary from disk
 * @param {string} filePath - Path to file on disk (from multer disk storage)
 * @param {string} originalName - Original file name
 * @param {string} folder - Cloudinary folder (e.g., 'receipts/membership', 'receipts/booking', 'receipts/order')
 * @returns {Promise<Object>} - Cloudinary upload result with url
 */
async function uploadReceipt(filePath, originalName, folder) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: folder,
                resource_type: 'auto',
                public_id: `${Date.now()}-${originalName.split('.')[0]}`,
                overwrite: false
            },
            (error, result) => {
                if (error) {
                    reject(new Error(`Cloudinary upload failed: ${error.message}`));
                } else {
                    resolve({
                        url: result.secure_url,
                        publicId: result.public_id,
                        size: result.bytes,
                        format: result.format
                    });
                }
            }
        );

        // Read file from disk and pipe to Cloudinary
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(stream);

        fileStream.on('error', (err) => {
            reject(new Error(`Failed to read file: ${err.message}`));
        });
    });
}

/**
 * Upload a file buffer to Cloudinary (legacy support)
 * @param {Buffer} fileBuffer - File buffer from multer memory storage
 * @param {string} originalName - Original file name
 * @param {string} folder - Cloudinary folder
 * @returns {Promise<Object>} - Cloudinary upload result
 */
async function uploadReceiptFromBuffer(fileBuffer, originalName, folder) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: folder,
                resource_type: 'auto',
                public_id: `${Date.now()}-${originalName.split('.')[0]}`,
                overwrite: false
            },
            (error, result) => {
                if (error) {
                    reject(new Error(`Cloudinary upload failed: ${error.message}`));
                } else {
                    resolve({
                        url: result.secure_url,
                        publicId: result.public_id,
                        size: result.bytes,
                        format: result.format
                    });
                }
            }
        );

        stream.end(fileBuffer);
    });
}

/**
 * Delete a file from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<Object>} - Deletion result
 */
async function deleteReceipt(publicId) {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    } catch (error) {
        throw new Error(`Cloudinary deletion failed: ${error.message}`);
    }
}

/**
 * Get file URL from Cloudinary public ID
 * @param {string} publicId - Cloudinary public ID
 * @returns {string} - Secure URL
 */
function getReceiptUrl(publicId) {
    return cloudinary.url(publicId, { secure: true });
}

module.exports = {
    uploadReceipt,
    uploadReceiptFromBuffer,
    deleteReceipt,
    getReceiptUrl,
    cloudinary
};
