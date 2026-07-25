const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const webpush = require('web-push');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/authRoutes');
const messageRoutes = require('./routes/messageRoutes');
const friendRoutes = require('./routes/friendRoutes');
const groupRoutes = require('./routes/groupRoutes');
const groupMessageRoutes = require('./routes/groupMessageRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const pollRoutes = require('./routes/pollRoutes');
const postRoutes = require('./routes/postRoutes');
const User = require('./models/User');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

webpush.setVapidDetails('mailto:updown@resend.dev', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: ['http://localhost:5173', 'https://updown-app.onrender.com'], methods: ['GET', 'POST'] } });
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: ['http://localhost:5173', 'https://updown-app.onrender.com'] }));
app.use(express.json({ limit: '50mb' }));

const apiLimiter = rateLimit({ windowMs: 15*60*1000, max: 100 });
app.use('/api/', apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/group-messages', groupMessageRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/polls', pollRoutes);
app.use('/api/posts', postRoutes);

app.post('/api/push/subscribe', async (req, res) => {
  try { await User.findByIdAndUpdate(req.body.userId, { pushSubscription: req.body.subscription }); res.json({ success: true }); } catch (e) { res.status(500).json({ message: e.message }); }
});

mongoose.connect(process.env.MONGO_URI).then(() => console.log('MongoDB Connected')).catch(err => console.log(err));

const onlineUsers = new Map();
io.on('connection', (socket) => {
  console.log('a user connected:', socket.id);
  socket.on('setup', (userId) => { onlineUsers.set(userId, socket.id); io.emit('users online', Array.from(onlineUsers.keys())); });
  socket.on('join chat', (room) => socket.join(room));
  socket.on('typing', ({ conversationId, senderName }) => socket.to(conversationId).emit('user typing', senderName));
  socket.on('stop typing', ({ conversationId }) => socket.to(conversationId).emit('user stop typing'));
  socket.on('send message', async (data) => { /* existing message logic */ });
  socket.on('disconnect', async () => { /* existing */ });
});

app.get('/', (req, res) => res.send('Server is running...'));
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
