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

// Helper function to send verification email
const sendVerificationEmail = async (email, verifyToken) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verifyToken}`;
  await transporter.sendMail({
    from: `"UpDown Chat" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Verify your email - UpDown',
    html: `<h2>Welcome to UpDown!</h2><p>Click the link below to verify your email:</p><a href="${verificationUrl}">${verificationUrl}</a>`,
  });
};

const signup = async (req, res) => {
  const { fullName, username, email, password } = req.body;
  try {
    // Check if user already exists with this email or username
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      if (!existingUser.isVerified) {
        // User exists but not verified – resend verification email
        const verifyToken = crypto.randomBytes(32).toString('hex');
        existingUser.verifyToken = verifyToken;
        await existingUser.save();
        try {
          await sendVerificationEmail(email, verifyToken);
          return res.status(200).json({ message: 'A verification email has been sent to your email address. Please check your inbox.' });
        } catch (emailErr) {
          console.error('Resend email error:', emailErr);
          return res.status(500).json({ message: 'Failed to send verification email. Please try again later.' });
        }
      }
      // User exists and is verified
      return res.status(400).json({ message: 'User already exists' });
    }

    // New user
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
      return res.status(201).json({ message: 'Registration successful! Please check your email to verify your account.' });
    } catch (emailErr) {
      console.error('Signup email error:', emailErr);
      // User created but email not sent – still return success but with a warning
      return res.status(201).json({ message: 'Account created, but verification email could not be sent. You can request a new verification email later.' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Resend verification email (separate endpoint for convenience)
const resendVerification = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'No account found with that email' });
    if (user.isVerified) return res.status(400).json({ message: 'Account is already verified' });
    const verifyToken = crypto.randomBytes(32).toString('hex');
    user.verifyToken = verifyToken;
    await user.save();
    await sendVerificationEmail(email, verifyToken);
    res.json({ message: 'Verification email resent. Please check your inbox.' });
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
    if (!user.isVerified) {
      // Option to resend verification automatically or just inform
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
