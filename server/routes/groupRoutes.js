const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Group = require('../models/Group');
const User = require('../models/User');

// Create group
router.post('/', protect, async (req, res) => {
  const { name, members } = req.body; // members array of user IDs
  if (!name || !members || members.length === 0) {
    return res.status(400).json({ message: 'Group name and members are required' });
  }
  // Ensure admin is included in members
  const allMembers = [...new Set([req.user._id.toString(), ...members])];
  try {
    const group = await Group.create({
      name,
      admin: req.user._id,
      members: allMembers
    });
    const populated = await group.populate('members', 'username email profilePic');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get groups for current user
router.get('/', protect, async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id })
      .populate('members', 'username email profilePic')
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
      .populate('members', 'username email profilePic');
    if (!group) return res.status(404).json({ message: 'Group not found' });
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
