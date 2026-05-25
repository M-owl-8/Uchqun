import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

// One per assessment time point per ИРР (intake, 3mo, 6mo, 9mo, 12mo, or custom).
// totalScore and maxPossibleScore are stored (not computed on read) for fast retrieval.
// Per OQ-1 decision: all 17 criteria are always scored; max = 68.
const AssessmentSession = sequelize.define('AssessmentSession', {
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
  completedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'SET NULL',
  },
  sessionType: {
    type: DataTypes.ENUM('intake', '3mo', '6mo', '9mo', '12mo', 'custom'),
    allowNull: false,
  },
  customLabel: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  assessmentDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  totalScore: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  maxPossibleScore: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 68,
  },
  isHearingImpaired: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'assessment_sessions',
  timestamps: true,
  paranoid: false,
});

export default AssessmentSession;
