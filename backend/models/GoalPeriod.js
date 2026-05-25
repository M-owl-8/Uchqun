import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

// One per 3-month quarter per ИРР. Quarterly review fields filled at period end.
// Signatures stored as timestamps (digital; physical signatures remain required per F-2).
const GoalPeriod = sequelize.define('GoalPeriod', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  irrId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'irrs', key: 'id' },
    onDelete: 'CASCADE',
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
  periodStart: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  periodEnd: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('active', 'reviewed', 'completed'),
    allowNull: false,
    defaultValue: 'active',
  },
  // Quarterly review fields (filled when status transitions to 'reviewed')
  overallAssessment: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  planChanges: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  parentRecommendations: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  nextReviewDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  nextAssessmentDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  parentDiscussionDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  // Digital signature timestamps (OQ-7: physical signatures still required per F-2)
  teacherSignedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  teacherSignedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'SET NULL',
  },
  managerSignedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  managerSignedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'SET NULL',
  },
}, {
  tableName: 'goal_periods',
  timestamps: true,
  paranoid: false,
});

export default GoalPeriod;
