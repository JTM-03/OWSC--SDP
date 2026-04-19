const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create temporary upload directory if it doesn't exist
const uploadDir = path.join(__dirname, '../../uploads/temp');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer to use disk storage (saves to temp folder before uploading to Cloudinary)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Save files to temporary uploads folder
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename: timestamp-randomnumber-originalname
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        cb(null, `${name}-${uniqueSuffix}${ext}`);
    }
});

// File filter to only accept images and PDFs
const fileFilter = (req, file, cb) => {
    // Allowed MIME types
    const allowedMimes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf'
    ];

    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type. Only images (JPG, PNG, GIF, WebP) and PDFs are allowed. Received: ${file.mimetype}`));
    }
};

// Configure multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB max file size
    }
});

/**
 * Middleware to handle single file upload
 * Usage: router.post('/upload', uploadSingleReceipt, handler)
 */
const uploadSingleReceipt = upload.single('receipt');

/**
 * Middleware to handle an array of files
 * Usage: router.post('/upload-multiple', uploadMultipleReceipts('receipts'), handler)
 */
const uploadMultipleReceipts = (fieldName = 'receipts') => {
    return upload.array(fieldName, 5); // Max 5 files at once
};

/**
 * Error handler middleware for multer errors
 * Place this after your routes
 */
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'FILE_TOO_LARGE') {
            return res.status(400).json({
                error: 'File too large. Maximum size is 10MB.',
                code: 'FILE_TOO_LARGE'
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                error: 'Too many files. Maximum is 5 files.',
                code: 'LIMIT_FILE_COUNT'
            });
        }
        return res.status(400).json({
            error: err.message,
            code: err.code
        });
    }

    if (err) {
        // Custom error from fileFilter
        return res.status(400).json({
            error: err.message,
            code: 'INVALID_FILE_TYPE'
        });
    }

    next();
};

/**
 * Utility function to clean up temporary files
 * Call this after successfully uploading to Cloudinary
 * @param {string|array} filePath - Path(s) to file(s) to delete
 */
const cleanupTempFiles = (filePath) => {
    if (!filePath) return;

    const filePaths = Array.isArray(filePath) ? filePath : [filePath];

    filePaths.forEach(file => {
        if (file && fs.existsSync(file)) {
            fs.unlink(file, (err) => {
                if (err) {
                    console.error(`Failed to delete temp file ${file}:`, err.message);
                } else {
                    console.log(`✅ Cleaned up temp file: ${file}`);
                }
            });
        }
    });
};

module.exports = {
    uploadSingleReceipt,
    uploadMultipleReceipts,
    handleMulterError,
    cleanupTempFiles
};
