import { Comment } from '../models/Comment.js';
import { Post } from '../models/Post.js';

export const addComment = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;

    const comment = await Comment.create({
      postId,
      authorId: req.userId,
      content
    });

    // Update post comment count
    await Post.findByIdAndUpdate(postId, {
      $inc: { commentsCount: 1 }
    });

    const populatedComment = await Comment.findById(comment._id)
      .populate('authorId', 'fullName avatarUrl')
      .exec();

    res.status(201).json({
      success: true,
      data: populatedComment
    });
  } catch (error) {
    next(error);
  }
};

export const getComments = async (req, res, next) => {
  try {
    const { postId } = req.params;

    const comments = await Comment.find({ postId })
      .sort({ createdAt: -1 })
      .populate('authorId', 'fullName avatarUrl')
      .lean();

    res.json({
      success: true,
      data: comments
    });
  } catch (error) {
    next(error);
  }
};
