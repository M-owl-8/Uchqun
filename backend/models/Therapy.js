import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Therapy = sequelize.define('Therapy', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: { type: DataTypes.STRING(500), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  therapyType: {
    type: DataTypes.ENUM('music', 'video', 'content', 'art', 'physical', 'speech', 'occupational', 'other'),
    allowNull: false,
  },
  contentUrl: { type: DataTypes.TEXT, allowNull: true },
  contentType: {
    type: DataTypes.ENUM('audio', 'video', 'image', 'document', 'interactive', 'link'),
    allowNull: true,
  },
  duration: { type: DataTypes.INTEGER, allowNull: true },
  ageGroup: {
    type: DataTypes.ENUM('infant', 'toddler', 'preschool', 'school_age', 'adolescent', 'all'),
    defaultValue: 'all',
    allowNull: false,
  },
  difficultyLevel: {
    type: DataTypes.ENUM('beginner', 'intermediate', 'advanced', 'all'),
    defaultValue: 'all',
    allowNull: false,
  },
  tags: { type: DataTypes.ARRAY(DataTypes.STRING), allowNull: true, defaultValue: [] },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true, allowNull: false },
  usageCount: { type: DataTypes.INTEGER, defaultValue: 0, allowNull: false },
  rating: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: true,
    defaultValue: 0,
    validate: { min: 0, max: 5 },
  },
  ratingCount: { type: DataTypes.INTEGER, defaultValue: 0, allowNull: false },
}, {
  tableName: 'therapies',
  timestamps: true,
  paranoid: true,
  indexes: [
    { fields: ['therapyType'] },
    { fields: ['ageGroup'] },
    { fields: ['difficultyLevel'] },
    { fields: ['isActive'] },
    { fields: ['createdBy'] },
  ],
});

export default Therapy;
