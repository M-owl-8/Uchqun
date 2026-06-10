import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

// Per-month projected milestone for a single long-term goal.
//
// Up to 12 milestones per LongTermGoal (one per month within the IRR's
// 12-month window). Captures the teacher's forward-looking target for what
// the child should look like at month N, plus actual outcome once the month
// is reached.
//
// Unique on (longTermGoalId, monthNumber) — one milestone per goal per month.
//
// Status semantics:
//   planned   — target set, month not yet reached or not yet evaluated
//   achieved  — month evaluated; outcome matched target
//   partial   — month evaluated; outcome partially matched target
//   missed    — month evaluated; outcome did not match target
const MonthlyMilestone = sequelize.define('MonthlyMilestone', {
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
  longTermGoalId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'long_term_goals', key: 'id' },
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
  monthNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 12 },
  },
  targetText: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('planned', 'achieved', 'partial', 'missed'),
    allowNull: false,
    defaultValue: 'planned',
  },
  actualText: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  assessedAt: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  assessedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'SET NULL',
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'monthly_milestones',
  timestamps: true,
  paranoid: false,
  indexes: [
    { fields: ['irrId'] },
    { fields: ['longTermGoalId'] },
    { fields: ['childId', 'monthNumber'] },
    { fields: ['schoolId'] },
    { unique: true, fields: ['longTermGoalId', 'monthNumber'], name: 'mm_ltg_month_unique' },
  ],
});

export default MonthlyMilestone;
