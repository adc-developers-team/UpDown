const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '15m' });
const generateRefreshToken = (id) => jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

const signup = async (req, res) => {
  // same as before, but generate refreshToken too
  // ... (unchanged, just add refreshToken in response)
};

const login = async (req, res) => {
  // ... (same, return token and refreshToken)
  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  res.json({ ...user.toObject(), token, refreshToken });
};

const refreshToken = async (req, res) => {
  const { token: oldToken } = req.body;
  if (!oldToken) return res.status(400).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(oldToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: 'User not found' });
    const newToken = generateToken(user._id);
    res.json({ token: newToken });
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = { signup, login, verifyEmail, resendVerification, refreshToken };
