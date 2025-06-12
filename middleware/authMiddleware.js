const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Adjust path as necessary

exports.protect = async (req, res, next) => {
  // ... (existing protect middleware code)
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.userId).select('-password');
      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }
      next();
    } catch (error) {
      console.error('Token verification error:', error.message);
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Not authorized, token failed verification' });
      }
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Not authorized, token expired' });
      }
      return res.status(401).json({ message: 'Not authorized, token invalid' });
    }
  }
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

// Role-based access control middleware
// Example: authorize(['admin', 'editor'])
exports.authorize = (roles) => {
  return (req, res, next) => {
    // req.user should be populated by the 'protect' middleware
    if (!req.user || !req.user.roles) {
      return res.status(403).json({ message: 'User roles not found. Ensure protect middleware is used first.' });
    }

    // Convert roles to an array if it's not already
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    // Check if the user's roles array includes any of the allowed roles
    const hasRequiredRole = req.user.roles.some(role => allowedRoles.includes(role));

    if (!hasRequiredRole) {
      return res.status(403).json({
        message: `Forbidden. User role(s) '${req.user.roles.join(', ')}' not authorized for this resource. Required: ${allowedRoles.join(' or ')}.`
      });
    }
    next(); // User has one of the required roles
  };
};
