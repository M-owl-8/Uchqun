import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

// FACILITY-LEVEL — one per school per quarter. NO childId (per OQ-3 + OQ-6 design).
// Completed by daycare manager (раҳбар) / admin role ONLY.
// departures: [{ name, admitDate, departDate, reason }] — children who left during the quarter.
const QuarterlyMonitoringEntry = sequelize.define('QuarterlyMonitoringEntry', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  schoolId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'schools', key: 'id' },
    onDelete: 'RESTRICT',
  },
  recordedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'SET NULL',
  },
  quarterStart: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  recordedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
  },
  infoSystemData: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
  parentWorkData: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
  documentationData: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
  careQualityData: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
  conditionsData: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
  departures: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'quarterly_monitoring_entries',
  timestamps: true,
  paranoid: false,
});

export default QuarterlyMonitoringEntry;
