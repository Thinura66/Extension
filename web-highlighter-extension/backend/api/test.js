export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      message: 'API is working!',
      timestamp: new Date().toISOString(),
      environment: {
        hasMongoUri: !!process.env.MONGO_URI,
        hasCorsOrigin: !!process.env.CORS_ORIGIN,
        nodeVersion: process.version
      }
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}