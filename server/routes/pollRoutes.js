const express = require('express');
const router = express.Router();
const Poll = require('../models/Poll');
const Group = require('../models/Group');
const { protect } = require('../middleware/auth');

// Create poll
router.post('/', protect, async (req, res) => {
  try {
    const { question, options, groupId } = req.body;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!group.members.includes(req.user._id)) return res.status(403).json({ message: 'Not a member' });

    const poll = await Poll.create({
      question,
      options: options.map(opt => ({ text: opt, votes: [] })),
      group: groupId,
      creator: req.user._id,
    });
    res.status(201).json(poll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Vote
router.post('/:pollId/vote', protect, async (req, res) => {
  try {
    const { optionIndex } = req.body;
    const poll = await Poll.findById(req.params.pollId);
    if (!poll) return res.status(404).json({ message: 'Poll not found' });
    if (poll.status !== 'active') return res.status(400).json({ message: 'Poll closed' });

    // Remove previous vote of this user
    poll.options.forEach(opt => opt.votes = opt.votes.filter(v => v.toString() !== req.user._id.toString()));
    if (optionIndex >= 0 && optionIndex < poll.options.length) {
      poll.options[optionIndex].votes.push(req.user._id);
    }
    await poll.save();
    res.json(poll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get polls for a group
router.get('/group/:groupId', protect, async (req, res) => {
  try {
    const polls = await Poll.find({ group: req.params.groupId })
      .populate('creator', 'username fullName')
      .sort({ createdAt: -1 });
    res.json(polls);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Close poll
router.put('/:pollId/close', protect, async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.pollId);
    if (!poll) return res.status(404).json({ message: 'Poll not found' });
    if (poll.creator.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not authorized' });
    poll.status = 'closed';
    await poll.save();
    res.json(poll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
