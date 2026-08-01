import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from './auth/authRoutes.js';
import profilesRoutes from './profiles/profileRoutes.js';
import interestsRoutes from './interests/interestsRoutes.js';
import reportsRoutes from './reports/reportsRoutes.js';
import feedbackRoutes from './ratings/feedbackRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { setupMatchingHandler } from './sockets/matchingHandler.js';
import { startMatchingSweep, stopMatchingSweep } from './matching/matchingService.js';
import { setupChatRequestHandler } from './sockets/chatRequestHandler.js';
import { addOnlineUser, removeOnlineUser, getUserIdFromSocket } from './sockets/onlineUsersManager.js';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Basic test route
app.get('/api', (req, res) => {
  res.json({ message: 'melo.tv API server running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/profile', profilesRoutes);
app.use('/api/interests', interestsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/feedback', feedbackRoutes);

app.use(errorHandler);

// Socket.io initialization
io.on('connection', (socket) => {
  const token = socket.handshake.auth?.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as { userId: string };
      addOnlineUser(decoded.userId, socket.id);
    } catch (err) {
      console.error('Socket JWT verification failed', err);
    }
  }

  setupMatchingHandler(io, socket);
  setupChatRequestHandler(io, socket);

  socket.on('disconnect', () => {
    const userId = getUserIdFromSocket(socket.id);
    if (userId) {
      removeOnlineUser(userId, socket.id);
    }
  });
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/melotv';

// Database connection
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    startMatchingSweep();
    server.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });

// Graceful shutdown handling for Nodemon and PM2
const gracefulShutdown = () => {
  console.log('Shutting down gracefully...');
  stopMatchingSweep();
  server.close(() => {
    mongoose.connection.close(false).then(() => {
      console.log('Closed server and database connections.');
      process.exit(0);
    });
  });
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('SIGUSR2', gracefulShutdown); // specifically for nodemon restarts
