const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Post = require('../models/Post');
const Comment = require('../models/Comment');

// Create post
router.post('/', protect, async (req, res) => {
  const { text, image, video, privacy, hashtags } = req.body;
  try {
    const post = await Post.create({
      author: req.user._id,
      text: text || '',
      image: image || '',
      video: video || '',
      privacy: privacy || 'public',
      hashtags: hashtags || [],
    });
    const populated = await post.populate('author', 'username fullName profilePic isVerified');
    res.status(201).json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Get feed with ranking
router.get('/', protect, async (req, res) => {
  const { filter = 'latest', page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;
  try {
    let query = { status: 'active' };
    if (filter === 'friends') {
      const user = await require('../models/User').findById(req.user._id);
      const friendIds = user.friends || [];
      query.author = { $in: [req.user._id, ...friendIds] };
    } else if (filter === 'following') {
      // Following logic (simplified)
      query.author = { $ne: req.user._id };
    }
    // else: all public posts for 'latest','recommended','trending'
    const posts = await Post.find(query)
      .populate('author', 'username fullName profilePic isVerified')
      .populate({ path: 'comments', populate: { path: 'author', select: 'username fullName' } })
      .sort({ isPinned: -1, score: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));
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
    const populated = await post.populate('author', 'username fullName profilePic isVerified');
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
    const populatedComment = await comment.populate('author', 'username fullName profilePic isVerified');
    res.status(201).json(populatedComment);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Report post
router.post('/:id/report', protect, async (req, res) => {
  const { reason } = req.body;
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    const alreadyReported = post.reports.some(r => r.reportedBy.toString() === req.user._id.toString());
    if (alreadyReported) return res.status(400).json({ message: 'Already reported' });
    post.reports.push({ reportedBy: req.user._id, reason });
    post.reportCount = post.reports.length;
    if (post.reportCount >= 5) post.status = 'hidden'; // auto-hide after 5 reports
    await post.save();
    res.json({ message: 'Report submitted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Delete post (owner or moderator)
router.delete('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'moderator') {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    await Comment.deleteMany({ post: post._id });
    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: 'Post deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Pin/unpin post (owner)
router.put('/:id/pin', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.author.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Unauthorized' });
    post.isPinned = !post.isPinned;
    await post.save();
    res.json(post);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
