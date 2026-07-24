const express = require('express');
const router = express.Router();
const { sendMessage, getMessages } = require('../controllers/messageController');
const Message = require('../models/Message');
const { protect } = require('../middleware/auth');

router.post('/', sendMessage);
router.get('/:userId1/:userId2', getMessages);

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
    const lastMessages = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: new (require('mongoose').Types.ObjectId)(userId) },
            { receiver: new (require('mongoose').Types.ObjectId)(userId) }
          ]
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$conversationId',
          lastMessage: { $first: '$$ROOT' }
        }
      },
      { $replaceRoot: { newRoot: '$lastMessage' } },
      { $sort: { createdAt: -1 } }
    ]);
    await Message.populate(lastMessages, [
      { path: 'sender', select: 'username profilePic' },
      { path: 'receiver', select: 'username profilePic' }
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
    const objectId = new (require('mongoose').Types.ObjectId)(userId);
    const unreadCounts = await Message.aggregate([
      {
        $match: {
          receiver: objectId,
          status: { $ne: 'read' }
        }
      },
      {
        $group: {
          _id: '$sender',
          count: { $sum: 1 }
        }
      }
    ]);
    // Convert array to object { senderId: count }
    const result = {};
    unreadCounts.forEach(item => {
      result[item._id.toString()] = item.count;
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
