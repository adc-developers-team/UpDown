const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '15m' });
const generateRefreshToken = (id) => jwt.sign({ id }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, { expiresIn: '7d' });

const sendBrevoEmail = async (email, subject, htmlContent) => {
  await axios.post('https://api.brevo.com/v3/smtp/email', {
    sender: { email: 'messagetoupdown.hq@gmail.com', name: 'UpDown Chat' },
    to: [{ email }], subject, htmlContent,
  }, { headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json' } });
};

const signup = async (req, res) => { /* ... unchanged ... */ };
const verifyEmail = async (req, res) => { /* ... unchanged ... */ };
const resendVerification = async (req, res) => { /* ... unchanged ... */ };
const forgotPassword = async (req, res) => { /* ... unchanged ... */ };
const resetPassword = async (req, res) => { /* ... unchanged ... */ };

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    if (!user.isVerified) {
      return res.status(401).json({ message: 'Please verify your email before logging in.', email: user.email });
    }
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    const session = {
      token: refreshToken,
      device: req.headers['user-agent'] || 'Unknown',
      ip: req.ip || req.connection.remoteAddress || 'Unknown',
    };
    user.sessions.push(session);
    await user.save();
    res.json({
      _id: user._id, fullName: user.fullName, username: user.username, email: user.email,
      profilePic: user.profilePic, token, refreshToken,
    });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const refreshTokenFn = async (req, res) => {
  const { token: oldToken } = req.body;
  if (!oldToken) return res.status(400).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(oldToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: 'User not found' });
    const session = user.sessions.find(s => s.token === oldToken);
    if (!session) return res.status(401).json({ message: 'Session expired' });
    session.lastActive = new Date();
    await user.save();
    const newToken = generateToken(user._id);
    res.json({ token: newToken });
  } catch (err) { res.status(401).json({ message: 'Invalid token' }); }
};

const getSessions = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json(user.sessions);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const removeSession = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const sessionId = req.params.sessionId;
    user.sessions = user.sessions.filter(s => s._id.toString() !== sessionId);
    await user.save();
    res.json({ message: 'Session removed', sessions: user.sessions });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const logout = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const refreshToken = req.body.refreshToken;
    if (refreshToken) {
      user.sessions = user.sessions.filter(s => s.token !== refreshToken);
    } else {
      user.sessions = [];
    }
    await user.save();
    res.json({ message: 'Logged out successfully' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

module.exports = { signup, login, verifyEmail, resendVerification, refreshToken: refreshTokenFn, forgotPassword, resetPassword, getSessions, removeSession, logout };
