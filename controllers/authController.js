const User = require('../models/User');
const jwt = require('jsonwebtoken'); // Import jsonwebtoken
// bcryptjs is already used in User model, no need to import here explicitly unless used directly

// Register function (from previous step, ensure it's still there)
exports.register = async (req, res, next) => {
  // ... (existing register code)
  try {
    const { email, password, roles } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }
    const user = new User({ email, password, roles });
    await user.save();
    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please login.'
    });

  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};


// Login function
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials (user not found)' });
    }

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials (password mismatch)' });
    }

    // User is valid, generate JWT
    const payload = {
      userId: user._id,
      email: user.email,
      roles: user.roles
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );

    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      token: token,
      // Optionally return user data (excluding password)
      // user: {
      //   id: user._id,
      //   email: user.email,
      //   roles: user.roles
      // }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
    // next(error); // Or pass to a global error handler
  }
};
