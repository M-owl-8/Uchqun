import { DataTypes, Op } from 'sequelize';
import crypto from 'crypto';
import sequelize from '../config/database.js';
import logger from '../utils/logger.js';

const RefreshToken = sequelize.define('RefreshToken', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  tokenHash: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'token_hash',
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    field: 'user_id',
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'expires_at',
  },
  revoked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  revokedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'revoked_at',
  },
}, {
  tableName: 'refresh_tokens',
  timestamps: true,
  underscored: false,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

RefreshToken.hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

RefreshToken.verifyToken = async (token, userId) => {
  try {
    const hash = RefreshToken.hashToken(token);
    return await RefreshToken.findOne({
      where: {
        tokenHash: hash,
        userId,
        revoked: false,
        expiresAt: { [Op.gt]: new Date() },
      },
    });
  } catch (error) {
    logger.error('RefreshToken.verifyToken error', { error: error.message });
    return null;
  }
};

export default RefreshToken;
