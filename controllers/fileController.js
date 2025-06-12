// controllers/fileController.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const FileMetadata = require('../models/FileMetadata'); // Import the model
// User model might be needed if we want to do further checks on uploader, but protect middleware gives us req.user
// const User = require('../models/User');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({ /* ... existing config ... */
  destination: function (req, file, cb) { cb(null, uploadDir); },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const fileFilter = (req, file, cb) => { /* ... existing config ... */
    if (file.mimetype.startsWith('image/')) { cb(null, true); }
    else { cb(new Error('Not an image! Please upload only images.'), false); }
};
const upload = multer({ storage: storage, limits: { fileSize: 1024 * 1024 * 5 }, fileFilter: fileFilter }).single('file');

exports.uploadFile = (req, res, next) => {
  upload(req, res, async function (err) { // Make this async
    if (err) { // Simplified error handling from previous step
      // Multer specific errors
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'File too large. Max size is 5MB.' });
        }
        return res.status(400).json({ message: err.message });
      }
      // Other errors (e.g., from fileFilter)
      return res.status(400).json({ message: err.message || 'Error during upload.' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No file selected for upload.' });
    }

    try {
      // Create FileMetadata document
      const newFileMetadata = new FileMetadata({
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: req.file.path, // Path where multer saved the file
        uploader: req.user._id, // From 'protect' middleware
        // associatedCollection and associatedRecordId can be passed in req.body if needed
        associatedCollection: req.body.associatedCollection,
        associatedRecordId: req.body.associatedRecordId,
      });
      await newFileMetadata.save();

      res.status(201).json({
        success: true,
        message: 'File uploaded and metadata saved successfully!',
        data: newFileMetadata // Return the full metadata document
      });
    } catch (metadataError) {
      console.error('Error saving file metadata:', metadataError);
      // If metadata fails, we might want to delete the orphaned uploaded file
      fs.unlink(req.file.path, (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting orphaned file:', unlinkErr);
      });
      res.status(500).json({ message: 'Error saving file metadata.', error: metadataError.message });
    }
  });
};

exports.downloadFile = async (req, res, next) => { // Make this async
  const { filename } = req.params;
  if (!filename) return res.status(400).json({ message: 'Filename is required.' });

  const sanitizedFilename = path.basename(filename);
  if (sanitizedFilename !== filename) {
      return res.status(400).json({ message: 'Invalid filename format.' });
  }

  try {
    const metadata = await FileMetadata.findOne({ filename: sanitizedFilename });

    if (!metadata) {
      return res.status(404).json({ message: 'File metadata not found. File may not exist or is not tracked.' });
    }

    // Optional: Add access control here based on metadata.uploader or roles
    // For example: if (metadata.uploader.toString() !== req.user._id.toString() && !req.user.roles.includes('admin')) {
    //   return res.status(403).json({ message: 'Forbidden: You do not own this file.' });
    // }

    const filePath = metadata.path; // Use path from metadata for reliability

    if (fs.existsSync(filePath)) {
      // Use originalName for the download
      res.download(filePath, metadata.originalName, (err) => {
        if (err) {
          console.error('Error downloading file:', err);
          if (!res.headersSent) {
            res.status(500).json({ message: 'Could not download the file.' });
          }
        }
      });
    } else {
      // File path from metadata doesn't exist on disk - data inconsistency
      console.error(`File system inconsistency: File ${filePath} referenced in metadata not found.`);
      // We could try to remove this orphaned metadata entry here.
      res.status(404).json({ message: 'File not found on server, though metadata exists.' });
    }
  } catch (error) {
    console.error('Error during file download process:', error);
    res.status(500).json({ message: 'Server error during file download.' });
  }
};
