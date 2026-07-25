const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  token: { type: String, required: true },
  device: { type: String, default: 'Unknown' },
  ip: { type: String, default: 'Unknown' },
  lastActive: { type: Date, default: Date.now },
}, { _id: true });

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, default: '' },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    profilePic: { type: String, default: '' },
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    lastSeen: { type: Date, default: Date.now },
    isVerified: { type: Boolean, default: false },
    verifyToken: { type: String },
    pushSubscription: { type: Object, default: null },
    privacy: {
      showLastSeen: { type: Boolean, default: true },
      showOnlineStatus: { type: Boolean, default: true },
      sendReadReceipts: { type: Boolean, default: true },
    },
    chatSettings: { autoDownloadMedia: { type: Boolean, default: true } },
    status: { type: String, enum: ['active', 'deactivated', 'deleted'], default: 'active' },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    sessions: [sessionSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
