const express = require('express');
const router = express.Router();
const GroupMessage = require('../models/GroupMessage');

// Get messages for a group
router.get('/:groupId', async (req, res) => {
  try {
    const messages = await GroupMessage.find({ group: req.params.groupId })
      .populate('sender', 'username profilePic')
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
