import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { getRedisClient } from '../utils/redisClient.js';
import logger from '../utils/logger.js';

export { User };

let io = null;

// Map userId -> Set of socketIds for targeted emission
const userSockets = new Map();

const SOCKET_DEFAULT_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5177',
  'https://uchqunedu.uz',
  'https://www.uchqunedu.uz',
  'https://uchqun-reception.netlify.app',
  'https://uchqun-admin.netlify.app',
  'https://uchqun-teacher.netlify.app',
  'https://uchqun-government.netlify.app',
  'https://uchqun-platform.vercel.app',
];

export const initializeSocket = (server) => {
  const envOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map((s) => s.trim()).filter(Boolean)
    : [];
  const allowedOrigins = envOrigins.length > 0
    ? [...new Set([...SOCKET_DEFAULT_ORIGINS, ...envOrigins])]
    : SOCKET_DEFAULT_ORIGINS;

  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Use Redis pub/sub adapter when available so events fan out across instances
  const redisClient = getRedisClient();
  if (redisClient) {
    const subClient = redisClient.duplicate();
    io.adapter(createAdapter(redisClient, subClient));
    logger.info('[Socket] Redis adapter enabled');
  } else {
    logger.warn('[Socket] Redis unavailable — in-memory adapter (single-instance only)');
  }

  // Auth middleware — validate JWT on every connection
  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers?.cookie || '';
      const cookieToken = cookieHeader.match(/(?:^|;\s*)accessToken=([^;]+)/)?.[1];
      const token = socket.handshake.auth?.token || cookieToken;
      if (!token) return next(new Error('No token provided'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.userId, {
        attributes: ['id', 'role', 'schoolId', 'isActive'],
      });

      if (!user) return next(new Error('User not found'));

      socket.userId = user.id;
      socket.userRole = user.role;
      socket.schoolId = user.schoolId;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { userId, userRole } = socket;
    logger.info('[Socket] Client connected', { socketId: socket.id, userId, userRole });

    // Track socket by userId
    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId).add(socket.id);

    // Join a room per user for targeted messages
    socket.join(`user:${userId}`);

    socket.on('disconnect', (reason) => {
      logger.info('[Socket] Client disconnected', { socketId: socket.id, userId, reason });
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) userSockets.delete(userId);
      }
    });

    socket.on('error', (err) => {
      logger.error('[Socket] Socket error', { socketId: socket.id, error: err.message });
    });
  });

  logger.info('[Socket] Socket.io initialized');
  return io;
};

// Emit an event to all sockets belonging to a user
export const emitToUser = async (userId, event, data) => {
  try {
    if (!io) {
      logger.debug('[Socket] emitToUser skipped — not initialized', { userId, event });
      return;
    }
    io.to(`user:${userId}`).emit(event, data);
    logger.debug('[Socket] Emitted to user', { userId, event });
  } catch (error) {
    logger.error('[Socket] emitToUser error', { error: error.message, userId, event });
  }
};

export const getIO = () => io;

export default { User, initializeSocket, emitToUser, getIO };
