const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Group = require('../models/Group');
const User = require('../models/User');

// Create group
router.post('/', protect, async (req, res) => {
  const { name, members } = req.body;
  if (!name || !members || members.length === 0) {
    return res.status(400).json({ message: 'Group name and members are required' });
  }
  const allMembers = [...new Set([req.user._id.toString(), ...members])];
  try {
    const group = await Group.create({
      name,
      admin: req.user._id,
      members: allMembers
    });
    const populated = await group.populate('members', 'username email profilePic fullName');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get groups for current user
router.get('/', protect, async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id })
      .populate('members', 'username email profilePic fullName')
      .sort({ updatedAt: -1 });
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single group
router.get('/:id', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('members', 'username email profilePic fullName');
    if (!group) return res.status(404).json({ message: 'Group not found' });
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Leave group
router.put('/:id/leave', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!group.members.includes(req.user._id)) {
      return res.status(400).json({ message: 'You are not a member' });
    }
    group.members = group.members.filter(id => id.toString() !== req.user._id.toString());
    // If admin leaves, assign new admin if members remain
    if (group.admin.toString() === req.user._id.toString() && group.members.length > 0) {
      group.admin = group.members[0];
    }
    await group.save();
    res.json({ message: 'You left the group' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Kick member (admin only)
router.put('/:id/kick', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only admin can remove members' });
    }
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'User ID is required' });
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Admin cannot kick themselves. Use Leave instead.' });
    }
    group.members = group.members.filter(id => id.toString() !== userId);
    await group.save();
    const populated = await group.populate('members', 'username email profilePic fullName');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
