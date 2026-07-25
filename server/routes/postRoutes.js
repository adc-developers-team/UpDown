const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Post = require('../models/Post');
const Comment = require('../models/Comment');

// Create post
router.post('/', protect, async (req, res) => {
  const { text, image, hashtags } = req.body;
  try {
    const post = await Post.create({ author: req.user._id, text, image, hashtags });
    const populated = await post.populate('author', 'username fullName profilePic');
    res.status(201).json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Get posts (feed)
router.get('/', protect, async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('author', 'username fullName profilePic')
      .populate({ path: 'comments', populate: { path: 'author', select: 'username fullName' } })
      .sort({ isPinned: -1, createdAt: -1 });
    res.json(posts);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Like / Unlike
router.put('/:id/like', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    const idx = post.likes.indexOf(req.user._id);
    if (idx > -1) post.likes.splice(idx, 1);
    else post.likes.push(req.user._id);
    await post.save();
    const populated = await post.populate('author', 'username fullName profilePic');
    res.json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Add comment
router.post('/:id/comment', protect, async (req, res) => {
  const { text } = req.body;
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    const comment = await Comment.create({ post: post._id, author: req.user._id, text });
    post.comments.push(comment._id);
    await post.save();
    const populatedComment = await comment.populate('author', 'username fullName profilePic');
    res.status(201).json(populatedComment);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Delete post
router.delete('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.author.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Unauthorized' });
    await Comment.deleteMany({ post: post._id });
    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: 'Post deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
