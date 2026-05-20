import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ChildGoal = sequelize.define('ChildGoal', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  childId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'children', key: 'id' },
    onDelete: 'SET NULL',
  },
  schoolId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'schools', key: 'id' },
    onDelete: 'RESTRICT',
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'SET NULL',
  },
  category: {
    type: DataTypes.ENUM(
      'communication', 'social_emotional', 'cognitive',
      'fine_motor', 'gross_motor', 'self_care', 'behavioral', 'academic'
    ),
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  measurement: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  baseline: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  targetDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  currentProgress: {
    type: DataTypes.ENUM('not_started', 'emerging', 'developing', 'achieved', 'discontinued'),
    allowNull: false,
    defaultValue: 'not_started',
  },
  progressNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  childSnapshot: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
}, {
  tableName: 'child_goals',
  timestamps: true,
  paranoid: true,
});

export default ChildGoal;
