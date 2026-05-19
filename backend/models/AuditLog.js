import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  },
  actorId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  actorRole: {
    type: DataTypes.STRING(30),
    allowNull: false,
  },
  action: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  entity: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  entityId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  schoolId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  meta: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  occurredAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'audit_log',
  timestamps: false,
});

// Immutability guards — audit_log entries are write-once; no updates or deletes permitted.
const immutableError = () => { throw new Error('audit_log is immutable'); };
AuditLog.update = immutableError;
AuditLog.destroy = immutableError;

export default AuditLog;
