import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const GovernmentStats = sequelize.define('GovernmentStats', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  region: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  district: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  schoolId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'schools',
      key: 'id',
    },
  },
  statType: {
    type: DataTypes.ENUM('overview', 'schools', 'students', 'teachers', 'ratings', 'therapies', 'activities', 'complaints'),
    allowNull: false,
  },
  period: {
    type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'quarterly', 'yearly'),
    allowNull: false,
  },
  periodStart: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  periodEnd: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  data: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  summary: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  generatedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  generatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'government_stats',
  timestamps: true,
  indexes: [
    { fields: ['region'] },
    { fields: ['district'] },
    { fields: ['schoolId'] },
    { fields: ['statType'] },
    { fields: ['period'] },
    { fields: ['periodStart', 'periodEnd'] },
  ],
});

export default GovernmentStats;
