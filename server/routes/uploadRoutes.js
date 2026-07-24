const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const { protect } = require('../middleware/auth');
const User = require('../models/User');

// Profile pic upload
router.post('/profile-pic', protect, async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ message: 'No image provided' });
    const uploadResponse = await cloudinary.uploader.upload(image, {
      folder: 'updown_profiles',
      width: 300,
      height: 300,
      crop: 'fill',
    });
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { profilePic: uploadResponse.secure_url },
      { new: true }
    ).select('-password');
    res.json({ message: 'Profile picture updated', profilePic: user.profilePic });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Audio upload
router.post('/audio', protect, async (req, res) => {
  try {
    const { audio } = req.body;
    if (!audio) return res.status(400).json({ message: 'No audio provided' });
    const uploadResponse = await cloudinary.uploader.upload(audio, {
      resource_type: 'video',
      folder: 'updown_audio',
    });
    res.json({ message: 'Audio uploaded', audioUrl: uploadResponse.secure_url });
  } catch (error) {
    console.error('Audio upload error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Image upload
router.post('/image', protect, async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ message: 'No image provided' });
    const uploadResponse = await cloudinary.uploader.upload(image, {
      folder: 'updown_chat_images',
      width: 1200,
      height: 1200,
      crop: 'limit',
    });
    res.json({ message: 'Image uploaded', imageUrl: uploadResponse.secure_url });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ message: error.message });
  }
});

// 🆕 Video upload
router.post('/video', protect, async (req, res) => {
  try {
    const { video } = req.body; // base64 data URL
    if (!video) return res.status(400).json({ message: 'No video provided' });
    const uploadResponse = await cloudinary.uploader.upload(video, {
      resource_type: 'video',
      folder: 'updown_videos',
    });
    res.json({ message: 'Video uploaded', videoUrl: uploadResponse.secure_url });
  } catch (error) {
    console.error('Video upload error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
