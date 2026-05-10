import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const AIWarning = sequelize.define('AIWarning', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  warningType: {
    type: DataTypes.ENUM('low_rating', 'declining_rating', 'negative_feedback', 'complaint', 'safety_concern', 'quality_issue', 'other'),
    allowNull: false,
  },
  severity: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    defaultValue: 'medium',
    allowNull: false,
  },
  targetType: {
    type: DataTypes.ENUM('school', 'parent', 'teacher', 'child'),
    allowNull: false,
  },
  // Polymorphic FK — references schools, users, or children depending on targetType.
  // A traditional DB FK constraint is not possible; application-level validation
  // via validateTargetExists() must be called before creating a warning.
  targetId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  schoolId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'schools',
      key: 'id',
    },
  },
  parentId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  title: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  aiAnalysis: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  ratingData: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  isResolved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  resolvedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  resolutionNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  notifiedUsers: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    allowNull: true,
    defaultValue: [],
  },
}, {
  tableName: 'ai_warnings',
  timestamps: true,
  indexes: [
    { fields: ['warningType'] },
    { fields: ['severity'] },
    { fields: ['targetType', 'targetId'] },
    { fields: ['schoolId'] },
    { fields: ['parentId'] },
    { fields: ['isResolved'] },
    { fields: ['createdAt'] },
  ],
});

export default AIWarning;
