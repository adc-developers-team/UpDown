const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    conversationId: { type: String, required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, default: '' },
    image: { type: String, default: '' },
    status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
    reactions: { type: Map, of: [String], default: {} },
    mediaType: { type: String, enum: ['text', 'image', 'video', 'audio', 'poll'], default: 'text' },
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    pollId: { type: mongoose.Schema.Types.ObjectId, ref: 'Poll', default: null },
    pinned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', messageSchema);
