import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const News = sequelize.define('News', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: { type: DataTypes.STRING(500), allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  published: { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: false },
  targetAudience: {
    type: DataTypes.ENUM('all', 'parents', 'teachers', 'admins'),
    defaultValue: 'all',
    allowNull: false,
  },
  createdById: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  },
}, {
  tableName: 'news',
  timestamps: true,
  indexes: [
    { fields: ['published', 'targetAudience'] },
    { fields: ['createdById'] },
  ],
});

// Associations defined in models/index.js

export default News;
