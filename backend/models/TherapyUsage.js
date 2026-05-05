import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const TherapyUsage = sequelize.define('TherapyUsage', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  therapyId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'therapies', key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  childId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'children', key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  parentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  },
  teacherId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  startTime: { type: DataTypes.DATE, allowNull: false },
  endTime: { type: DataTypes.DATE, allowNull: true },
  duration: { type: DataTypes.INTEGER, allowNull: true },
  progress: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 0, max: 100 },
  },
  notes: { type: DataTypes.TEXT, allowNull: true },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 1, max: 5 },
  },
  feedback: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'therapy_usages',
  timestamps: true,
  paranoid: true,
  indexes: [
    { fields: ['therapyId'] },
    { fields: ['childId'] },
    { fields: ['parentId'] },
    { fields: ['teacherId'] },
    { fields: ['startTime'] },
  ],
});

export default TherapyUsage;
