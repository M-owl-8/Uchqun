import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

// Up to 5 long-term goals per ИРР, tied to ПТПК conclusion validity period.
// Per OQ-11 decision: no skill-area tag — free-form text per the standard.
const LongTermGoal = sequelize.define('LongTermGoal', {
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
  sortOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  goalText: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  targetPeriodStart: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  targetPeriodEnd: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
}, {
  tableName: 'long_term_goals',
  timestamps: true,
  paranoid: false,
});

export default LongTermGoal;
