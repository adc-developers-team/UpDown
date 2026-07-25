const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const cloudinary = require('cloudinary').v2;
const webpush = require('web-push');

const authRoutes = require('./routes/authRoutes');
const messageRoutes = require('./routes/messageRoutes');
const friendRoutes = require('./routes/friendRoutes');
const groupRoutes = require('./routes/groupRoutes');
const groupMessageRoutes = require('./routes/groupMessageRoutes');
const pollRoutes = require('./routes/pollRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const User = require('./models/User');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

webpush.setVapidDetails(
  'mailto:updown@resend.dev',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  'http://localhost:5173',
  'https://updown-app.onrender.com',
];

const io = new Server(server, { cors: { origin: allowedOrigins, methods: ['GET', 'POST'] } });
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: allowedOrigins }));
n// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Too many requests, please try again later.' }
});
app.use('/api/', apiLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many authentication attempts, please try again later.' }
});
app.use('/api/auth/', authLimiter);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/group-messages', groupMessageRoutes);
app.use('/api/polls', pollRoutes);
app.use('/api/upload', uploadRoutes);

app.post('/api/push/subscribe', async (req, res) => {
  try {
    const { subscription, userId } = req.body;
    await User.findByIdAndUpdate(userId, { pushSubscription: subscription });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/push/unsubscribe', async (req, res) => {
  try {
    const { userId } = req.body;
    await User.findByIdAndUpdate(userId, { pushSubscription: null });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log('MongoDB connection error:', err));

const onlineUsers = new Map();

const sendPushNotification = async (userId, payload) => {
  try {
    const user = await User.findById(userId);
    if (user && user.pushSubscription) {
      await webpush.sendNotification(user.pushSubscription, JSON.stringify(payload));
    }
  } catch (err) {
    console.error('Push error:', err);
  }
};

io.on('connection', (socket) => {
  console.log('a user connected:', socket.id);

  socket.on('setup', (userId) => {
    onlineUsers.set(userId, socket.id);
    User.findByIdAndUpdate(userId, { lastSeen: null }).catch(console.error);
    io.emit('users online', Array.from(onlineUsers.keys()));
  });

  socket.on('join chat', (room) => { socket.join(room); });
  socket.on('typing', ({ conversationId, senderName }) => { socket.to(conversationId).emit('user typing', senderName); });
  socket.on('stop typing', ({ conversationId }) => { socket.to(conversationId).emit('user stop typing'); });

  socket.on('send message', async (data) => {
    const { senderId, receiverId, text, image, mediaType, replyTo } = data;
    const conversationId = [senderId, receiverId].sort().join('_');
    const Message = require('./models/Message');
    let status = 'sent';
    if (onlineUsers.has(receiverId)) status = 'delivered';
    const message = await Message.create({
      conversationId, sender: senderId, receiver: receiverId, text: text || '', image: image || '', status, mediaType: mediaType || 'text',
      replyTo: replyTo || null
    });
    let populated = await Message.findById(message._id)
      .populate('sender', 'username profilePic fullName')
      .populate('receiver', 'username profilePic fullName')
      .populate({
        path: 'replyTo',
        populate: { path: 'sender', select: 'username fullName' }
      })
      .populate({
        path: 'replyTo',
        populate: { path: 'sender', select: 'username fullName' }
      });
    io.to(conversationId).emit('message received', populated);
    if (onlineUsers.has(receiverId)) {
      io.to(conversationId).emit('message status update', { messageId: message._id, status: 'delivered' });
    } else {
      sendPushNotification(receiverId, {
        title: populated.sender.fullName || populated.sender.username,
        body: text || 'Sent an attachment',
        url: `/chat/${senderId}`,
      });
    }
  });

  socket.on('mark as read', async ({ conversationId, userId }) => {
    const Message = require('./models/Message');
    await Message.updateMany(
      { conversationId, receiver: userId, status: { $ne: 'read' } },
      { $set: { status: 'read' } }
    );
    io.to(conversationId).emit('messages read', { conversationId, reader: userId });
  });

  socket.on('delete message', async ({ messageId, conversationId }) => {
    try {
      const Message = require('./models/Message');
      await Message.findByIdAndDelete(messageId);
      io.to(conversationId).emit('message deleted', messageId);
    } catch (err) { console.error(err); }
  });

  socket.on('react to message', async ({ messageId, emoji, userId, conversationId }) => {
    try {
      const Message = require('./models/Message');
      const message = await Message.findById(messageId);
      if (!message) return;
      const reactions = message.reactions instanceof Map ? Object.fromEntries(message.reactions) : {};
      if (!reactions[emoji]) reactions[emoji] = [];
      if (reactions[emoji].includes(userId)) {
        reactions[emoji] = reactions[emoji].filter(id => id !== userId);
        if (reactions[emoji].length === 0) delete reactions[emoji];
      } else {
        reactions[emoji].push(userId);
      }
      message.reactions = reactions;
      await message.save();
      let populated = await Message.findById(message._id)
        .populate('sender', 'username profilePic fullName')
        .populate('receiver', 'username profilePic fullName')
      .populate({
        path: 'replyTo',
        populate: { path: 'sender', select: 'username fullName' }
      });
      io.to(conversationId).emit('message reaction updated', populated);
    } catch (err) { console.error(err); }
  });

  socket.on('join group', (groupId) => { socket.join(groupId); });
  socket.on('group typing', ({ groupId, senderName }) => { socket.to(groupId).emit('group user typing', { senderName }); });
  socket.on('stop group typing', ({ groupId }) => { socket.to(groupId).emit('group user stop typing'); });
  socket.on('send group message', async (data) => {
    const { groupId, senderId, text, image } = data;
    const GroupMessage = require('./models/GroupMessage');
    const message = await GroupMessage.create({
      group: groupId, sender: senderId, text: text || '', image: image || ''
    });
    const populated = await GroupMessage.findById(message._id).populate('sender', 'username profilePic fullName');
    io.to(groupId).emit('group message received', populated);
  });

  socket.on('call-user', ({ callerId, receiverId, signal, callType }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('incoming-call', { callerId, signal, callType });
    } else {
      User.findById(callerId).then(caller => {
        sendPushNotification(receiverId, {
          title: caller.fullName || caller.username,
          body: `Incoming ${callType === 'video' ? 'video' : 'voice'} call`,
          url: `/chat/${callerId}`,
        });
      });
      socket.emit('call-failed', { message: 'User is offline' });
    }
  });

  socket.on('accept-call', ({ callerId, signal }) => {
    const callerSocketId = onlineUsers.get(callerId);
    if (callerSocketId) io.to(callerSocketId).emit('call-accepted', { signal });
  });
  socket.on('reject-call', ({ callerId }) => {
    const callerSocketId = onlineUsers.get(callerId);
    if (callerSocketId) io.to(callerSocketId).emit('call-rejected');
  });
  socket.on('end-call', ({ to }) => {
    const toSocketId = onlineUsers.get(to);
    if (toSocketId) io.to(toSocketId).emit('call-ended');
  });
  socket.on('ice-candidate', ({ to, candidate }) => {
    const toSocketId = onlineUsers.get(to);
    if (toSocketId) io.to(toSocketId).emit('ice-candidate', { candidate });
  });
  socket.on('set-username', (username) => { socket.userName = username; });

  socket.on('disconnect', async () => {
    for (let [userId, sid] of onlineUsers.entries()) {
      if (sid === socket.id) {
        onlineUsers.delete(userId);
        await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
        break;
      }
    }
    io.emit('users online', Array.from(onlineUsers.keys()));
  });
});

app.get('/', (req, res) => res.send('Server is running...'));
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
