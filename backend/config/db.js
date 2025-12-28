const mongoose = require('mongoose');

const connectDB = async () => {
  // Config for environments where 127.0.0.1 is preferred over localhost
  const connString = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hyrost';
  
  try {
    const conn = await mongoose.connect(connString, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    global.dbConnected = true;
    return conn;
  } catch (err) {
    console.error(`MongoDB Connection Error: ${err.message}`);
    console.log('RUNNING IN NO-DB MODE (In-Memory Only)');
    
    // In strict production environments, you might want to exit:
    // process.exit(1); 
    
    // For this project, we fallback to No-DB mode
    global.dbConnected = false;
  }
};

module.exports = connectDB;
