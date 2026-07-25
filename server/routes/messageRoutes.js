const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Message = require('../models/Message');
const { protect } = require('../middleware/auth');

// POST /api/messages
router.post('/', protect, async (req, res) => {
  try {
    const { senderId, receiverId, text, image, mediaType } = req.body;
    const conversationId = [senderId, receiverId].sort().join('_');
    const message = await Message.create({
      conversationId,
      sender: senderId,
      receiver: receiverId,
      text: text || '',
      image: image || '',
      mediaType: mediaType || 'text',
    });
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/messages/:userId1/:userId2
router.get('/:userId1/:userId2', async (req, res) => {
  try {
    const { userId1, userId2 } = req.params;
    const conversationId = [userId1, userId2].sort().join('_');
    const messages = await Message.find({ conversationId })
      .populate('sender', 'username profilePic fullName')
      .populate('receiver', 'username profilePic fullName')
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/messages/:messageId
router.delete('/:messageId', protect, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own messages' });
    }
    await Message.findByIdAndDelete(req.params.messageId);
    res.json({ message: 'Message deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/messages/last-messages/:userId
router.get('/last-messages/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const objectId = new mongoose.Types.ObjectId(userId);
    const lastMessages = await Message.aggregate([
      { $match: { $or: [{ sender: objectId }, { receiver: objectId }] } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$conversationId', latestMessage: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$latestMessage' } },
      { $sort: { createdAt: -1 } }
    ]);
    await Message.populate(lastMessages, [
      { path: 'sender', select: 'username profilePic fullName' },
      { path: 'receiver', select: 'username profilePic fullName' }
    ]);
    res.json(lastMessages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/messages/unread-counts/:userId
router.get('/unread-counts/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const objectId = new mongoose.Types.ObjectId(userId);
    const unreadCounts = await Message.aggregate([
      { $match: { receiver: objectId, status: { $ne: 'read' } } },
      { $group: { _id: '$sender', count: { $sum: 1 } } }
    ]);
    const result = {};
    unreadCounts.forEach(item => { result[item._id.toString()] = item.count; });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
