import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ServicePlan = sequelize.define('ServicePlan', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  childId: { type: DataTypes.UUID, allowNull: false, field: 'child_id', references: { model: 'children', key: 'id' }, onDelete: 'CASCADE' },
  year: { type: DataTypes.INTEGER, allowNull: false },
  serviceType: {
    type: DataTypes.ENUM('logoped', 'defektolog', 'self_care', 'ipotherapy', 'music', 'labor', 'tmc', 'physiotherapy'),
    allowNull: false,
    field: 'service_type',
  },
  months: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: { jan: false, feb: false, mar: false, apr: false, may: false, jun: false, jul: false, aug: false, sep: false, oct: false, nov: false, dec: false },
  },
  createdBy: { type: DataTypes.UUID, allowNull: true, field: 'created_by', references: { model: 'users', key: 'id' } },
}, {
  tableName: 'service_plans',
  timestamps: true,
  paranoid: true,
  underscored: true,
  indexes: [
    { fields: ['child_id', 'year', 'service_type'], unique: true },
    { fields: ['child_id'] },
  ],
});

export default ServicePlan;
