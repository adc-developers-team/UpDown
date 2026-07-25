const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

const sendVerificationEmail = async (email, verifyToken) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verifyToken}`;
  try {
    await axios.post('https://api.brevo.com/v3/smtp/email', {
      sender: { email: 'messagetoupdown.hq@gmail.com', name: 'UpDown Chat' },
      to: [{ email }],
      subject: 'Verify your email address',
      htmlContent: `...`, // (উপরে দেওয়া HTML)
    }, {
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
    });
    console.log('Verification email sent to', email);
  } catch (err) {
    console.error('Brevo send error:', err.response?.data || err.message);
    throw new Error('Email sending failed');
  }
};

const signup = async (req, res) => {
  const { fullName, username, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      if (!existingUser.isVerified) {
        const verifyToken = crypto.randomBytes(32).toString('hex');
        existingUser.verifyToken = verifyToken;
        await existingUser.save();
        try {
          await sendVerificationEmail(email, verifyToken);
          return res.status(200).json({ message: 'A verification email has been sent to your email address.' });
        } catch (emailErr) {
          return res.status(500).json({ message: 'Failed to send verification email.' });
        }
      }
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const user = await User.create({
      fullName: fullName || '',
      username,
      email,
      password: hashedPassword,
      verifyToken,
      isVerified: false,
    });
    try {
      await sendVerificationEmail(email, verifyToken);
      return res.status(201).json({ message: 'Registration successful! Please check your email.' });
    } catch (emailErr) {
      return res.status(201).json({ message: 'Account created, but verification email could not be sent.' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const resendVerification = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'No account found with that email' });
    if (user.isVerified) return res.status(400).json({ message: 'Account is already verified' });
    const verifyToken = crypto.randomBytes(32).toString('hex');
    user.verifyToken = verifyToken;
    await user.save();
    try {
      await sendVerificationEmail(email, verifyToken);
      res.json({ message: 'Verification email resent.' });
    } catch (emailErr) {
      res.status(500).json({ message: 'Failed to send verification email.' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const verifyEmail = async (req, res) => {
  const { token } = req.query;
  try {
    const user = await User.findOne({ verifyToken: token });
    if (!user) return res.status(400).json({ message: 'Invalid or expired verification token' });
    user.isVerified = true;
    user.verifyToken = undefined;
    await user.save();
    res.json({ message: 'Email verified successfully!' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });
    if (!user.isVerified) {
      return res.status(401).json({ message: 'Please verify your email before logging in.', email: user.email });
    }
    if (await bcrypt.compare(password, user.password)) {
      res.json({
        _id: user._id,
        fullName: user.fullName,
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

module.exports = { signup, login, verifyEmail, resendVerification };
