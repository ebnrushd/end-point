// models/index.js
const mongoose = require('mongoose');

const User = require('./User');
const Author = require('./Author');
const Post = require('./Post');
const FileMetadata = require('./FileMetadata');
const ServerlessFunction = require('./ServerlessFunction'); // Import ServerlessFunction

const models = {
  users: User,
  authors: Author,
  posts: Post,
  filemetadatas: FileMetadata,
  serverlessfunctions: ServerlessFunction, // Register ServerlessFunction
};

const getModel = (modelName) => {
  // ... (existing getModel function, ensure it can find 'serverlessfunctions') ...
  if (!models[modelName]) {
    const lowerModelName = modelName.toLowerCase();
    if (models[lowerModelName]) { return models[lowerModelName]; }
    // Attempt to match common pluralizations or direct model names if needed
    const modelKeys = Object.keys(models);
    const foundKey = modelKeys.find(key => key.toLowerCase() === lowerModelName);
    if (foundKey) return models[foundKey];

    // Fallback for singular names if registered as plural
    const singularMatch = modelKeys.find(key => key.slice(0, -1).toLowerCase() === lowerModelName);
    if (singularMatch) return models[singularMatch];

    return null;
  }
  return models[modelName];
};

module.exports = {
  getModel,
  ...models
};
