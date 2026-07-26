const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, default: '' },
  image: { type: String, default: '' },
  video: { type: String, default: '' },
  privacy: { type: String, enum: ['public', 'friends', 'followers', 'private', 'custom'], default: 'public' },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
  hashtags: [String],
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isPinned: { type: Boolean, default: false },
  isSensitive: { type: Boolean, default: false },
  reportCount: { type: Number, default: 0 },
  reports: [{
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String, enum: ['spam','fake_news','harassment','hate_speech','violence','adult_content','scam','copyright','other'] },
    timestamp: { type: Date, default: Date.now }
  }],
  status: { type: String, enum: ['active', 'hidden', 'deleted'], default: 'active' },
  score: { type: Number, default: 0 },
}, { timestamps: true });

// Index for feed ranking
postSchema.index({ isPinned: -1, score: -1, createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);
