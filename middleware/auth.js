const jwt = require('jsonwebtoken');

module.exports = (allowedRoles = []) => (req, res, next) => {
  const authHeader = req.header('Authorization');
  console.log('Auth middleware - header:', authHeader);

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('Auth middleware: No token provided');
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    if (allowedRoles.length > 0 && !allowedRoles.includes(decoded.role)) {
      console.log(`Auth middleware: Unauthorized role - user: ${decoded.username}, role: ${decoded.role}, required: ${allowedRoles}`);
      return res.status(403).json({ error: 'Unauthorized role' });
    }

    console.log(`Auth middleware: Authorized - user: ${decoded.username}, role: ${decoded.role}`);
    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    return res.status(500).json({ error: 'Authentication error' });
  }
};
