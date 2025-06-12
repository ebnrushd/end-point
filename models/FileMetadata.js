// models/FileMetadata.js
const mongoose = require('mongoose');

const fileMetadataSchema = new mongoose.Schema({
  filename: { // Server-generated unique filename
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  originalName: { // Original name of the file from the user's system
    type: String,
    required: true,
    trim: true
  },
  mimeType: {
    type: String,
    required: true,
    trim: true
  },
  size: { // Size in bytes
    type: Number,
    required: true
  },
  path: { // Path on the server where the file is stored
    type: String,
    required: true
  },
  uploader: { // Reference to the User who uploaded the file
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Optional fields for associating file with a specific DB record
  associatedCollection: {
    type: String,
    trim: true
  },
  associatedRecordId: {
    // Could be ObjectId, but keeping as String for flexibility if IDs aren't always ObjectIds
    type: String,
    trim: true
  }
}, { timestamps: true });

// Optional: Index for quicker lookups if you often query by uploader or associated record
fileMetadataSchema.index({ uploader: 1 });
fileMetadataSchema.index({ associatedCollection: 1, associatedRecordId: 1 });

module.exports = mongoose.model('FileMetadata', fileMetadataSchema);
