// models/Post.js
const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Author', // This creates the relationship to the Author model
    required: true
  },
  tags: [String]
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);
