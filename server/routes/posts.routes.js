import express from 'express';
import { createPost, getFeedPosts, likePost } from '../controllers/post.controller.js';
import { addComment, getComments } from '../controllers/comment.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate); // All routes protected

router.get('/', getFeedPosts);
router.post('/', createPost);
router.post('/:postId/like', likePost);
router.post('/:postId/comments', addComment);
router.get('/:postId/comments', getComments);

export default router;
