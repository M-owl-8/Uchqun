import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  childId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'children',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  type: {
    type: DataTypes.ENUM('activity', 'meal', 'media', 'progress', 'general'),
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  relatedId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  relatedType: {
    type: DataTypes.ENUM('activity', 'meal', 'media', 'progress'),
    allowNull: true,
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  readAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  schoolId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'schools', key: 'id' },
    onDelete: 'SET NULL',
  },
}, {
  tableName: 'notifications',
  timestamps: true,
  indexes: [
    {
      fields: ['userId', 'isRead'],
    },
    {
      fields: ['createdAt'],
    },
  ],
});

// Note: All associations (belongsTo and hasMany) are defined in models/index.js
// to avoid circular dependencies and duplicate associations

export default Notification;

