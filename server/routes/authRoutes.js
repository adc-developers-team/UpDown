const express = require('express');
const router = express.Router();
const { signup, login, verifyEmail, resendVerification, refreshToken } = require('../controllers/authController');
// ... other routes
router.post('/refresh', refreshToken);
module.exports = router;
