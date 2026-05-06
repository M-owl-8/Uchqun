import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const BusinessStats = sequelize.define('BusinessStats', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  businessId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  statType: {
    type: DataTypes.ENUM('overview', 'users', 'usage'),
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
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  generatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'business_stats',
  timestamps: true,
  indexes: [
    { fields: ['businessId'] },
    { fields: ['statType'] },
    { fields: ['period'] },
    { fields: ['periodStart', 'periodEnd'] },
    { fields: ['isPublic'] },
  ],
});

export default BusinessStats;
