const connectDB = require("../src/config/db");

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      // Test database connection
      await connectDB();
      
      return res.status(200).json({
        success: true,
        message: 'Database connection successful!',
        timestamp: new Date().toISOString(),
        environment: {
          hasMongoUri: !!process.env.MONGO_URI,
          mongoUriPreview: process.env.MONGO_URI ? 
            `${process.env.MONGO_URI.substring(0, 20)}...` : 'Not set',
          nodeVersion: process.version
        }
      });
    } catch (error) {
      console.error('Database connection test failed:', error);
      return res.status(500).json({
        success: false,
        message: 'Database connection failed',
        error: error.message,
        environment: {
          hasMongoUri: !!process.env.MONGO_URI,
          mongoUriPreview: process.env.MONGO_URI ? 
            `${process.env.MONGO_URI.substring(0, 20)}...` : 'Not set',
          nodeVersion: process.version
        }
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}