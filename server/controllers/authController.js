const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// @desc    Register a new user & send verification email
// @route   POST /api/auth/signup
const signup = async (req, res) => {
  const { username, email, password } = req.body;
  try {
    // Check if user exists
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate verification token
    const verifyToken = crypto.randomBytes(32).toString('hex');

    // Create user
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      verifyToken,
      isVerified: false,
    });

    // Send verification email
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verifyToken}`;
    await transporter.sendMail({
      from: `"UpDown Chat" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verify your email - UpDown',
      html: `
        <h2>Welcome to UpDown!</h2>
        <p>Click the link below to verify your email:</p>
        <a href="${verificationUrl}">${verificationUrl}</a>
        <p>This link will expire in 24 hours.</p>
      `,
    });

    res.status(201).json({
      message: 'Registration successful! Please check your email to verify your account.',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify email
// @route   GET /api/auth/verify-email?token=...
const verifyEmail = async (req, res) => {
  const { token } = req.query;
  try {
    const user = await User.findOne({ verifyToken: token });
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }

    user.isVerified = true;
    user.verifyToken = undefined; // remove token
    await user.save();

    res.json({ message: 'Email verified successfully! You can now login.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.isVerified) {
      return res.status(401).json({ message: 'Please verify your email before logging in.' });
    }

    if (await bcrypt.compare(password, user.password)) {
      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        profilePic: user.profilePic,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { signup, login, verifyEmail };
