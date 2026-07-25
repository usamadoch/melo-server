import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from './auth/authRoutes.js';
import profilesRoutes from './profiles/profileRoutes.js';
import interestsRoutes from './interests/interestsRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { setupMatchingHandler } from './sockets/matchingHandler.js';

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

app.use(errorHandler);

// Socket.io initialization
io.on('connection', (socket) => {

  setupMatchingHandler(io, socket);

  socket.on('disconnect', () => {});
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/melotv';

// Database connection
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    server.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });
