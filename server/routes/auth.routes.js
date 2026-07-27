import express from 'express';
import { signup, login, refresh } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/refresh', refresh);
router.get('/me', authenticate, (req, res) => {
  res.json({
    success: true,
    data: { user: req.user }
  });
});

export default router;
