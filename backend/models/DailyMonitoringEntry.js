import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

// One per child per calendar day (per OQ-6 decision).
// Checklist data stored as JSONB (code → boolean) — data-driven.
// irrId is nullable: child may not yet have an ИРР when entry is created (OQ-5: optional).
const DailyMonitoringEntry = sequelize.define('DailyMonitoringEntry', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  childId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'children', key: 'id' },
    onDelete: 'CASCADE',
  },
  schoolId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'schools', key: 'id' },
    onDelete: 'RESTRICT',
  },
  irrId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'irrs', key: 'id' },
    onDelete: 'SET NULL',
  },
  recordedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'SET NULL',
  },
  entryDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  recordedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
  },
  hygieneData: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
  healthData: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
  giData: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'daily_monitoring_entries',
  timestamps: true,
  paranoid: false,
});

export default DailyMonitoringEntry;
