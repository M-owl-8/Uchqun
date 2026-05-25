import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

// 3–5 short-term goals per GoalPeriod (one 3-month quarter).
// skillAreaCode references shared/config/skillAreas.js codes — data-driven, not enum.
const ShortTermGoal = sequelize.define('ShortTermGoal', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  periodId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'goal_periods', key: 'id' },
    onDelete: 'CASCADE',
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
  skillAreaCode: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  goalText: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  taskSetDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  targetDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  tasks: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  methods: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  progress: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  observations: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'short_term_goals',
  timestamps: true,
  paranoid: false,
});

export default ShortTermGoal;
