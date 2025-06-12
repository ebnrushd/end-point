// models/ServerlessFunction.js
const mongoose = require('mongoose');

const serverlessFunctionSchema = new mongoose.Schema({
  // ... (name, description, code, version, uploader, config fields) ...
  name: { type: String, required: [true, 'Function name is required'], unique: true, trim: true, lowercase: true, match: /^[a-zA-Z0-9_-]+$/ },
  description: { type: String, trim: true },
  code: { type: String, required: [true, 'Function code is required'] },
  version: { type: String, default: '1.0.0' },
  uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  config: {
    timeout: { type: Number, default: 3000, min: [100, 'Timeout must be at least 100ms'], max: [30000, 'Timeout cannot exceed 30 seconds'] }
  },
  envVars: { // Store environment variables for the function
    type: mongoose.Schema.Types.Mixed, // Allows storing an object. For real security, encrypt sensitive values.
    default: {}
  }
}, { timestamps: true });

serverlessFunctionSchema.index({ name: 1 });
serverlessFunctionSchema.index({ uploader: 1 });

module.exports = mongoose.model('ServerlessFunction', serverlessFunctionSchema);
