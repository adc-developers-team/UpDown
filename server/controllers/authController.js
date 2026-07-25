const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
  connectionTimeout: 15000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
  family: 4,
});

const sendVerificationEmail = async (email, verifyToken) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verifyToken}`;
  try {
    await transporter.sendMail({
      from: `"UpDown Chat" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verify your email - UpDown',
      html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:30px 0">
          <tr><td align="center">
            <table width="400" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.05)">
              <tr><td style="background:#3b82f6;padding:20px;text-align:center">
                <span style="color:#fff;font-size:22px;font-weight:bold;letter-spacing:1px">UPDOWN</span>
              </td></tr>
              <tr><td style="padding:24px 20px;color:#333;font-size:15px;line-height:1.6">
                <p style="margin:0 0 12px;color:#666">Click below to verify your email address and activate your account.</p>
                <p style="margin:24px 0;text-align:center">
                  <a href="${verificationUrl}" style="display:inline-block;padding:12px 32px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:15px">Verify Email</a>
                </p>
                <p style="margin:16px 0 0;font-size:12px;color:#999">Button not working? Copy and paste this link into your browser:<br><a href="${verificationUrl}" style="color:#3b82f6;word-break:break-all">${verificationUrl}</a></p>
              </td></tr>
              <tr><td style="background:#fafafa;padding:12px 20px;text-align:center;font-size:11px;color:#aaa">
                © UpDown • Secure messaging, anywhere.
              </td></tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>`,
    });
    console.log('Verification email sent to', email);
  } catch (err) {
    console.error('sendVerificationEmail error:', err);
    throw err;
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
          console.error('Email error:', emailErr);
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
      console.error('Email error:', emailErr);
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
      console.error('Resend email error:', emailErr);
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
