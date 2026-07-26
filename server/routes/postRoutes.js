const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Post = require('../models/Post');
const Comment = require('../models/Comment');

// Create post (already exists)
router.post('/', protect, async (req, res) => {
  const { text, image, video, hashtags } = req.body;
  try {
    const post = await Post.create({ author: req.user._id, text, image: image || '', video: video || '', hashtags });
    const populated = await post.populate('author', 'username fullName profilePic');
    res.status(201).json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Get posts (with comment counts) - existing
router.get('/', protect, async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('author', 'username fullName profilePic')
      .sort({ isPinned: -1, createdAt: -1 });
    res.json(posts);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Like / Unlike post
router.put('/:id/like', protect, async (req, res) => { /* existing */ });

// Delete post
router.delete('/:id', protect, async (req, res) => { /* existing */ });

// ========== Comment endpoints ==========
// Get comments for a post (with pagination and nested replies)
router.get('/:id/comments', protect, async (req, res) => {
  try {
    const postId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;
    const sort = req.query.sort || 'newest'; // newest, oldest, top

    // Get top-level comments (no parent)
    let sortOption = { createdAt: -1 };
    if (sort === 'oldest') sortOption = { createdAt: 1 };
    else if (sort === 'top') sortOption = { likes: -1, createdAt: -1 }; // likes field doesn't exist yet, will add later

    const totalComments = await Comment.countDocuments({ post: postId, parent: null });
    const comments = await Comment.find({ post: postId, parent: null })
      .populate('author', 'username fullName profilePic')
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .lean();

    // For each comment, get its replies (up to 3, then count)
    for (let comment of comments) {
      const replies = await Comment.find({ parent: comment._id })
        .populate('author', 'username fullName profilePic')
        .sort({ createdAt: 1 })
        .limit(3)
        .lean();
      comment.replies = replies;
      comment.replyCount = await Comment.countDocuments({ parent: comment._id });
    }

    res.json({
      comments,
      totalComments,
      hasMore: skip + comments.length < totalComments,
      page,
      totalPages: Math.ceil(totalComments / limit),
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Add comment
router.post('/:id/comments', protect, async (req, res) => {
  const { text, parentCommentId } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ message: 'Comment text is required' });
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comment = await Comment.create({
      post: post._id,
      author: req.user._id,
      text: text.trim(),
      parent: parentCommentId || null,
    });

    // Add comment reference to post
    post.comments.push(comment._id);
    await post.save();

    const populated = await comment.populate('author', 'username fullName profilePic');
    res.status(201).json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Like a comment
router.put('/comments/:id/like', protect, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    const idx = comment.likes.indexOf(req.user._id);
    if (idx > -1) comment.likes.splice(idx, 1);
    else comment.likes.push(req.user._id);
    await comment.save();
    const populated = await comment.populate('author', 'username fullName profilePic');
    res.json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Delete comment
router.delete('/comments/:id', protect, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    if (comment.author.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Unauthorized' });
    await Comment.findByIdAndDelete(req.params.id);
    // Remove reference from post
    await Post.findByIdAndUpdate(comment.post, { $pull: { comments: comment._id } });
    res.json({ message: 'Comment deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
