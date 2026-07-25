const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Test email route (added for debugging)
const sendTestEmail = async (req, res) => {
  try {
    await transporter.sendMail({
      from: `"UpDown Test" <${process.env.EMAIL_USER}>`,
      to: req.body.email,
      subject: 'Test email from UpDown',
      html: '<p>If you see this, email sending works!</p>',
    });
    res.json({ message: 'Test email sent' });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ message: 'Failed to send test email: ' + error.message });
  }
};

const signup = async (req, res) => {
  const { fullName, username, email, password } = req.body;
  try {
    // Check if user exists (any status)
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      if (!existingUser.isVerified) {
        // User exists but not verified - resend verification email
        const verifyToken = crypto.randomBytes(32).toString('hex');
        existingUser.verifyToken = verifyToken;
        await existingUser.save();
        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verifyToken}`;
        try {
          await transporter.sendMail({
            from: `"UpDown Chat" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Verify your email - UpDown',
            html: `<h2>Welcome back!</h2><p>Click the link below to verify your email:</p><a href="${verificationUrl}">${verificationUrl}</a>`,
          });
          return res.json({ message: 'Verification email resent. Please check your inbox.' });
        } catch (emailErr) {
          console.error('Resend email error:', emailErr);
          return res.status(500).json({ message: 'Failed to send verification email. Please try again.' });
        }
      }
      return res.status(400).json({ message: 'User already exists' });
    }

    // New user creation
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
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verifyToken}`;
    try {
      await transporter.sendMail({
        from: `"UpDown Chat" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Verify your email - UpDown',
        html: `<h2>Welcome to UpDown!</h2><p>Click the link below to verify your email:</p><a href="${verificationUrl}">${verificationUrl}</a>`,
      });
      res.status(201).json({ message: 'Registration successful! Please check your email to verify your account.' });
    } catch (emailErr) {
      console.error('Signup email error:', emailErr);
      // User created but email not sent - still allow later verification
      res.status(201).json({ message: 'Account created but verification email failed. We will resend shortly.' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// verifyEmail, login (unchanged but included for completeness)
const verifyEmail = async (req, res) => {
  const { token } = req.query;
  try {
    const user = await User.findOne({ verifyToken: token });
    if (!user) return res.status(400).json({ message: 'Invalid or expired verification token' });
    user.isVerified = true;
    user.verifyToken = undefined;
    await user.save();
    res.json({ message: 'Email verified successfully! You can now login.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });
    if (!user.isVerified) return res.status(401).json({ message: 'Please verify your email before logging in.' });
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

module.exports = { signup, login, verifyEmail, sendTestEmail };
