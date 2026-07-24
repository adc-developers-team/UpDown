const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');

// Send friend request
router.post('/request', protect, async (req, res) => {
  try {
    const { to } = req.body;
    if (req.user._id.toString() === to) {
      return res.status(400).json({ message: 'Cannot add yourself' });
    }
    const alreadyFriends = req.user.friends.includes(to);
    if (alreadyFriends) {
      return res.status(400).json({ message: 'Already friends' });
    }
    const existingRequest = await FriendRequest.findOne({
      from: req.user._id,
      to,
      status: 'pending'
    });
    if (existingRequest) {
      return res.status(400).json({ message: 'Friend request already sent' });
    }
    const reverseRequest = await FriendRequest.findOne({
      from: to,
      to: req.user._id,
      status: 'pending'
    });
    if (reverseRequest) {
      reverseRequest.status = 'accepted';
      await reverseRequest.save();
      await User.findByIdAndUpdate(req.user._id, { $addToSet: { friends: to } });
      await User.findByIdAndUpdate(to, { $addToSet: { friends: req.user._id } });
      return res.json({ message: 'You are now friends!', status: 'accepted' });
    }
    const request = await FriendRequest.create({ from: req.user._id, to });
    res.status(201).json({ message: 'Friend request sent', request });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Accept or decline friend request (for receiver)
router.put('/request/:id', protect, async (req, res) => {
  try {
    const { action } = req.body;
    const request = await FriendRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.to.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (action === 'accept') {
      request.status = 'accepted';
      await request.save();
      await User.findByIdAndUpdate(request.from, { $addToSet: { friends: req.user._id } });
      await User.findByIdAndUpdate(req.user._id, { $addToSet: { friends: request.from } });
      return res.json({ message: 'Friend request accepted' });
    } else if (action === 'decline') {
      request.status = 'declined';
      await request.save();
      return res.json({ message: 'Friend request declined' });
    } else {
      return res.status(400).json({ message: 'Invalid action' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Cancel a sent friend request (new)
router.delete('/request/:id', protect, async (req, res) => {
  try {
    const request = await FriendRequest.findOne({
      _id: req.params.id,
      from: req.user._id,
      status: 'pending'
    });
    if (!request) {
      return res.status(404).json({ message: 'Request not found or not pending' });
    }
    await FriendRequest.findByIdAndDelete(request._id);
    res.json({ message: 'Friend request cancelled' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get friends list
router.get('/', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('friends', '-password');
    res.json(user.friends);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get pending sent requests (returns full request objects now, with id)
router.get('/requests/sent', protect, async (req, res) => {
  try {
    const requests = await FriendRequest.find({ from: req.user._id, status: 'pending' })
      .populate('to', 'username email profilePic')
      .sort({ createdAt: -1 });
    res.json(requests); // array of {_id, from, to, status, ...}
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get pending received requests
router.get('/requests/received', protect, async (req, res) => {
  try {
    const requests = await FriendRequest.find({ to: req.user._id, status: 'pending' })
      .populate('from', 'username email profilePic')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
