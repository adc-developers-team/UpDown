const Message = require('../models/Message');
const User = require('../models/User');

// @desc    Send a message
// @route   POST /api/messages
const sendMessage = async (req, res) => {
  const { senderId, receiverId, text } = req.body;
  try {
    const sender = await User.findById(senderId);
    const receiver = await User.findById(receiverId);
    if (!sender || !receiver) {
      return res.status(404).json({ message: 'User not found' });
    }

    const conversationId = [senderId, receiverId].sort().join('_');

    const message = await Message.create({
      conversationId,
      sender: senderId,
      receiver: receiverId,
      text,
    });

    // We'll emit via socket later, but we can just respond
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get messages between two users
// @route   GET /api/messages/:userId1/:userId2
const getMessages = async (req, res) => {
  const { userId1, userId2 } = req.params;
  try {
    const conversationId = [userId1, userId2].sort().join('_');
    const messages = await Message.find({ conversationId })
      .populate('sender', 'username profilePic')
      .populate('receiver', 'username profilePic')
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { sendMessage, getMessages };
