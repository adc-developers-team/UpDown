import { Post } from '../models/Post.js';
import { Comment } from '../models/Comment.js';
import { ApiError } from '../utils/ApiError.js';

export const createPost = async (req, res, next) => {
  try {
    const { content, images } = req.body;

    const post = await Post.create({
      authorId: req.userId,
      content,
      images: images || []
    });

    const populatedPost = await Post.findById(post._id)
      .populate('authorId', 'fullName avatarUrl')
      .exec();

    res.status(201).json({
      success: true,
      data: populatedPost
    });
  } catch (error) {
    next(error);
  }
};

export const getFeedPosts = async (req, res, next) => {
  try {
    const { limit = 20, skip = 0 } = req.query;

    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('authorId', 'fullName avatarUrl bio')
      .lean();

    res.json({
      success: true,
      data: posts,
      meta: {
        total: posts.length,
        hasMore: posts.length === parseInt(limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const likePost = async (req, res, next) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId);
    if (!post) throw new ApiError(404, 'Post not found');

    const likedIndex = post.likes.indexOf(req.userId);
    if (likedIndex > -1) {
      // Unlike
      post.likes.splice(likedIndex, 1);
    } else {
      // Like
      post.likes.push(req.userId);
    }

    await post.save();

    const updatedPost = await Post.findById(postId)
      .populate('authorId', 'fullName avatarUrl')
      .exec();

    res.json({
      success: true,
      data: updatedPost,
      isLiked: !likedIndex > -1
    });
  } catch (error) {
    next(error);
  }
};
