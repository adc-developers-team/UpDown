import express from 'express';
import { Story } from '../models/Story.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.post('/', async (req, res, next) => {
  try {
    const { images } = req.body;

    const story = await Story.create({
      userId: req.userId,
      images,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });

    res.status(201).json({
      success: true,
      data: story
    });
  } catch (error) {
    next(error);
  }
});

router.get('/user/:userId', async (req, res, next) => {
  try {
    const stories = await Story.find({
      userId: req.params.userId,
      expiresAt: { $gt: new Date() }
    }).lean();

    res.json({
      success: true,
      data: stories
    });
  } catch (error) {
    next(error);
  }
});

export default router;
