const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // FIX: Check for MONGO_URI (used in docker-compose) OR MONGODB_URI
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/medifind';
    
    console.log('🔄 Connecting to MongoDB at:', mongoURI);
    
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(`✓ MongoDB Connected: ${conn.connection.host}`);
    console.log(`✓ Database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`✗ MongoDB Connection Error: ${error.message}`);
    throw error;
  }
};

module.exports = connectDB;