import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ParentEvaluation = sequelize.define('ParentEvaluation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  parentId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'parent_id',
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  teacherId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'teacher_id',
    references: { model: 'users', key: 'id' },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  schoolId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'school_id',
    references: { model: 'schools', key: 'id' },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  period: {
    type: DataTypes.ENUM('daily', 'weekly', 'monthly'),
    allowNull: false,
  },
  answers: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  notes: { type: DataTypes.TEXT, allowNull: true },
  submittedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'submitted_at',
  },
}, {
  tableName: 'parent_evaluations',
  timestamps: true,
  underscored: true,
});

export default ParentEvaluation;
