import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import postsRoutes from './routes/posts.routes.js';
import storiesRoutes from './routes/stories.routes.js';
import { Message } from './models/Message.js';

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
  }
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/stories', storiesRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'UpDown API by ADC Developers', 
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// Socket.io (Chat - optional for now)
io.on('connection', (socket) => {
  console.log('✅ User connected:', socket.id);

  socket.on('message', async (data) => {
    try {
      const conversation = await Message.create({
        senderId: socket.userId || 'guest',
        conversationId: socket.userId || 'general',
        content: data.content,
        status: 'sent'
      });

      io.emit('message', conversation);
    } catch (error) {
      console.error('❌ Message error:', error.message);
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ User disconnected:', socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 UpDown Server running on port ${PORT}`);
  console.log(`📡 Socket.io ready for real-time connections`);
  console.log(`📰 Social Feed API ready!`);
});
