const express = require('express');
const router = express.Router();
const { signup, login, verifyEmail, resendVerification, refreshToken, forgotPassword, resetPassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Message = require('../models/Message');

router.post('/signup', signup);
router.post('/login', login);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/refresh', refreshToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

router.get('/check-username', async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ message: 'Username is required' });
  const user = await User.findOne({ username });
  res.json({ available: !user });
});

router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/profile', protect, async (req, res) => {
  try {
    const { fullName, username, profilePic } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (username && username !== user.username) {
      const existing = await User.findOne({ username });
      if (existing) return res.status(400).json({ message: 'Username already taken' });
      user.username = username;
    }
    if (fullName !== undefined) user.fullName = fullName;
    if (profilePic !== undefined) user.profilePic = profilePic;
    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id,
      fullName: updatedUser.fullName,
      username: updatedUser.username,
      email: updatedUser.email,
      profilePic: updatedUser.profilePic,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Privacy settings
router.put('/privacy', protect, async (req, res) => {
  try {
    const { showLastSeen, showOnlineStatus, sendReadReceipts } = req.body;
    const user = await User.findById(req.user._id);
    if (showLastSeen !== undefined) user.privacy.showLastSeen = showLastSeen;
    if (showOnlineStatus !== undefined) user.privacy.showOnlineStatus = showOnlineStatus;
    if (sendReadReceipts !== undefined) user.privacy.sendReadReceipts = sendReadReceipts;
    await user.save();
    res.json(user.privacy);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Chat settings
router.put('/chat-settings', protect, async (req, res) => {
  try {
    const { autoDownloadMedia } = req.body;
    const user = await User.findById(req.user._id);
    if (autoDownloadMedia !== undefined) user.chatSettings.autoDownloadMedia = autoDownloadMedia;
    await user.save();
    res.json(user.chatSettings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Clear chat history
router.delete('/chat-history', protect, async (req, res) => {
  try {
    await Message.deleteMany({
      $or: [{ sender: req.user._id }, { receiver: req.user._id }]
    });
    res.json({ message: 'Chat history cleared' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Deactivate account
router.put('/deactivate', protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { status: 'deactivated' });
    res.json({ message: 'Account deactivated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete account permanently
router.delete('/account', protect, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user._id);
    await Message.deleteMany({
      $or: [{ sender: req.user._id }, { receiver: req.user._id }]
    });
    res.json({ message: 'Account permanently deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Export user data
router.get('/export-data', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password').lean();
    const messages = await Message.find({
      $or: [{ sender: req.user._id }, { receiver: req.user._id }]
    }).populate('sender', 'username').populate('receiver', 'username').lean();
    res.json({ user, messages });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
