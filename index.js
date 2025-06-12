// index.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const http = require('http'); // Import http module
const initializeSocketIO = require('./socketManager'); // Import the socket manager

// ... (other route imports: authRoutes, testRoutes, etc.)
const authRoutes = require('./routes/authRoutes');
const testRoutes = require('./routes/testRoutes');
const dynamicCollectionRoutes = require('./routes/dynamicRoutes');
const fileRoutes = require('./routes/fileRoutes');
const serverlessRoutes = require('./routes/serverlessRoutes');


const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/baas_db';

// Middleware
app.use(express.json());
// app.use(cors()); // If you have a global CORS middleware for HTTP, ensure it's configured correctly with Socket.IO CORS.

// Database Connection
mongoose.connect(MONGO_URI, { /* useNewUrlParser: true, useUnifiedTopology: true */ }) // Mongoose 6+ doesn't need these
  .then(() => console.log('MongoDB connected successfully.'))
  .catch(err => console.error('MongoDB connection error:', err));

const db = mongoose.connection;
// These listeners are fine, but the console.log for 'Mongoose connected to ${MONGO_URI}' might be redundant with the .then above.
// db.on('connected', () => console.log(`Mongoose connected to ${MONGO_URI}`));
db.on('error', (err) => console.error('Mongoose connection error:', err)); // This one is good for ongoing errors
db.on('disconnected', () => console.log('Mongoose disconnected'));


// Create HTTP server explicitly
const httpServer = http.createServer(app);

// Initialize Socket.IO and pass the HTTP server
const io = initializeSocketIO(httpServer);
// You can attach 'io' to app.locals or export it from socketManager if you need to access it from request handlers/controllers
// For example: app.set('io', io); or export a getIO function from socketManager.


// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/test', testRoutes);
app.use('/api/collections', dynamicCollectionRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/serverless', serverlessRoutes);


app.get('/', (req, res) => {
  res.send('BaaS API is running with Socket.IO support!');
});

// Start the server
httpServer.listen(PORT, () => { // Use httpServer.listen instead of app.listen
  console.log(`Server (with Socket.IO) is running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down gracefully...');

  // 1. Close Mongoose connection
  try {
    await mongoose.connection.close();
    console.log('Mongoose connection closed.');
  } catch (err) {
    console.error('Error closing Mongoose connection:', err);
  }

  // 2. Close Socket.IO server
  io.close(() => {
    console.log('Socket.IO connections closed.');
    // 3. Close HTTP server after Socket.IO is closed
    httpServer.close(() => {
      console.log('HTTP server closed.');
      process.exit(0); // Exit process
    });
  });

  // Force shutdown if graceful takes too long
  setTimeout(() => {
    console.error('Graceful shutdown timed out. Forcing exit.');
    process.exit(1);
  }, 10000); // 10 seconds timeout
});
