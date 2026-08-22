const SERVER_API_KEY = process.env.MINECRAFT_BRIDGE_KEY;

function requireBridgeKey(req, res, next) {
  const apiKey = req.headers['x-bridge-api-key'];
  if (!SERVER_API_KEY) {
    return res.status(503).json({ success: false, message: 'Bridge key not configured on server' });
  }
  if (apiKey !== SERVER_API_KEY) {
    return res.status(401).json({ success: false, message: 'Unauthorized bridge key' });
  }
  next();
}

module.exports = { requireBridgeKey };
