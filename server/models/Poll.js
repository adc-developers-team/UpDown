const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema({
  text: String,
  votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});

const pollSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    options: [optionSchema],
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['active', 'closed'], default: 'active' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Poll', pollSchema);
