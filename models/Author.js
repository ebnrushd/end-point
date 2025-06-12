// models/Author.js
const mongoose = require('mongoose');

const authorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  bio: String,
  // email: { type: String, unique: true } // Could also link to a User
}, { timestamps: true });

module.exports = mongoose.model('Author', authorSchema);
