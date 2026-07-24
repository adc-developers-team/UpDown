const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;

const authRoutes = require('./routes/authRoutes');
const messageRoutes = require('./routes/messageRoutes');
const friendRoutes = require('./routes/friendRoutes');
const groupRoutes = require('./routes/groupRoutes');
const groupMessageRoutes = require('./routes/groupMessageRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const User = require('./models/User');

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: 'http://localhost:5173', methods: ['GET', 'POST'] }
});

const PORT = process.env.PORT || 5000;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json({ limit: '50mb' }));   // 🔼 increased from 10mb to 50mb
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/group-messages', groupMessageRoutes);
app.use('/api/upload', uploadRoutes);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log('MongoDB connection error:', err));

const onlineUsers = new Map();

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
    const { senderId, receiverId, text, image } = data;
    const conversationId = [senderId, receiverId].sort().join('_');
    const Message = require('./models/Message');
    let status = 'sent';
    if (onlineUsers.has(receiverId)) status = 'delivered';
    const message = await Message.create({
      conversationId, sender: senderId, receiver: receiverId, text: text || '', image: image || '', status
    });
    const populated = await Message.findById(message._id)
      .populate('sender', 'username profilePic')
      .populate('receiver', 'username profilePic');
    io.to(conversationId).emit('message received', populated);
    if (onlineUsers.has(receiverId)) {
      io.to(conversationId).emit('message status update', { messageId: message._id, status: 'delivered' });
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
  socket.on('join group', (groupId) => { socket.join(groupId); });
  socket.on('group typing', ({ groupId, senderName }) => { socket.to(groupId).emit('group user typing', { senderName }); });
  socket.on('stop group typing', ({ groupId }) => { socket.to(groupId).emit('group user stop typing'); });
  socket.on('send group message', async (data) => {
    const { groupId, senderId, text, image } = data;
    const GroupMessage = require('./models/GroupMessage');
    const message = await GroupMessage.create({
      group: groupId, sender: senderId, text: text || '', image: image || ''
    });
    const populated = await GroupMessage.findById(message._id).populate('sender', 'username profilePic');
    io.to(groupId).emit('group message received', populated);
  });
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
