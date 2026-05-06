import express from 'express';
import cookieParser from 'cookie-parser';
import { Sequelize, DataTypes } from 'sequelize';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Create in-memory SQLite database
const sequelize = new Sequelize('sqlite::memory:', {
  logging: false,
});

// Define User model for tests
const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'parent',
    allowNull: false,
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  documentsApproved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  avatar: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  notificationPreferences: {
    type: DataTypes.JSON,
    defaultValue: { email: true, push: true },
  },
  teacherId: { type: DataTypes.UUID, allowNull: true },
  groupId: { type: DataTypes.UUID, allowNull: true },
  createdBy: { type: DataTypes.UUID, allowNull: true },
}, {
  tableName: 'users',
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    },
  },
});

User.prototype.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

User.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.password;
  return values;
};

// Define RefreshToken model for tests
const RefreshToken = sequelize.define('RefreshToken', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  tokenHash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  revoked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  revokedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'refresh_tokens',
  timestamps: true,
});

RefreshToken.hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

RefreshToken.verifyToken = async (token, userId) => {
  const hash = RefreshToken.hashToken(token);
  const record = await RefreshToken.findOne({
    where: { tokenHash: hash, userId, revoked: false },
  });
  if (!record) return null;
  if (record.expiresAt < new Date()) {
    await record.update({ revoked: true, revokedAt: new Date() });
    return null;
  }
  return record;
};

// Define Child model for tests
const Child = sequelize.define('Child', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  dateOfBirth: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  parentId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  schoolId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  groupId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'children',
  timestamps: true,
});

User.hasMany(RefreshToken, { foreignKey: 'userId', as: 'refreshTokens' });
RefreshToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Child, { foreignKey: 'parentId', as: 'children' });
Child.belongsTo(User, { foreignKey: 'parentId', as: 'parent' });

import jwt from 'jsonwebtoken';

const generateTokens = (userId) => {
  const jti = crypto.randomUUID();
  const accessToken = jwt.sign({ userId, jti }, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId, jti: crypto.randomUUID() }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

// Build Express app with inline route handlers (avoiding real DB imports)
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  // Auth routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const user = await User.findOne({ where: { email: email.toLowerCase().trim() } });
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const isValid = await user.comparePassword(password);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const { accessToken, refreshToken } = generateTokens(user.id);

      await RefreshToken.create({
        tokenHash: RefreshToken.hashToken(refreshToken),
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      res.cookie('accessToken', accessToken, { httpOnly: true, path: '/' });
      res.cookie('refreshToken', refreshToken, { httpOnly: true, path: '/' });

      res.json({ success: true, accessToken, refreshToken, user: user.toJSON() });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/auth/refresh', async (req, res) => {
    try {
      const token = req.cookies?.refreshToken || req.body?.refreshToken;
      if (!token) {
        return res.status(400).json({ error: 'Refresh token is required' });
      }

      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      const user = await User.findByPk(decoded.userId);
      if (!user) {
        return res.status(401).json({ error: 'Invalid refresh token' });
      }

      const storedToken = await RefreshToken.verifyToken(token, user.id);
      if (!storedToken) {
        return res.status(401).json({ error: 'Refresh token revoked or expired' });
      }

      await storedToken.update({ revoked: true, revokedAt: new Date() });

      const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id);
      await RefreshToken.create({
        tokenHash: RefreshToken.hashToken(newRefreshToken),
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      res.cookie('accessToken', accessToken, { httpOnly: true, path: '/' });
      res.cookie('refreshToken', newRefreshToken, { httpOnly: true, path: '/' });

      res.json({ success: true, accessToken });
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Invalid or expired refresh token' });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Auth middleware for protected routes
  const authenticate = async (req, res, next) => {
    try {
      let token = req.cookies?.accessToken;
      if (!token) {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'No token provided' });
        }
        token = authHeader.substring(7);
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.userId);
      if (!user) return res.status(401).json({ error: 'User not found' });
      req.user = user;
      next();
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };

  app.get('/api/auth/me', authenticate, async (req, res) => {
    res.json(req.user.toJSON());
  });

  app.post('/api/auth/logout', authenticate, async (req, res) => {
    await RefreshToken.update(
      { revoked: true, revokedAt: new Date() },
      { where: { userId: req.user.id, revoked: false } }
    );
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.json({ success: true, message: 'Logged out successfully' });
  });

  // Child CRUD routes
  app.post('/api/child', authenticate, async (req, res) => {
    try {
      const child = await Child.create({ ...req.body, parentId: req.user.id });
      res.status(201).json({ success: true, data: child });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/child', authenticate, async (req, res) => {
    const children = await Child.findAll({ where: { parentId: req.user.id } });
    res.json({ success: true, data: children });
  });

  app.put('/api/child/:id', authenticate, async (req, res) => {
    const child = await Child.findOne({ where: { id: req.params.id, parentId: req.user.id } });
    if (!child) return res.status(404).json({ error: 'Child not found' });
    await child.update(req.body);
    res.json({ success: true, data: child });
  });

  app.delete('/api/child/:id', authenticate, async (req, res) => {
    const child = await Child.findOne({ where: { id: req.params.id, parentId: req.user.id } });
    if (!child) return res.status(404).json({ error: 'Child not found' });
    await child.destroy();
    res.json({ success: true, message: 'Child deleted' });
  });

  return app;
}

export { sequelize, User, RefreshToken, Child, createTestApp };
