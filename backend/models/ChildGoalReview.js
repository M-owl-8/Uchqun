import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ChildGoalReview = sequelize.define('ChildGoalReview', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  goalId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'child_goals', key: 'id' },
    onDelete: 'CASCADE',
  },
  reviewerId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'SET NULL',
  },
  reviewDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('on_track', 'progressing_slowly', 'not_progressing', 'achieved', 'revised'),
    allowNull: false,
  },
  evidence: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  nextSteps: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'child_goal_reviews',
  timestamps: true,
  paranoid: false,
});

export default ChildGoalReview;
