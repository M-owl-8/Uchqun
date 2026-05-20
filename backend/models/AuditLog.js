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
// Layer 1 (static): blocks AuditLog.update({...}) and AuditLog.destroy({...}) bulk operations.
const immutableError = () => { throw new Error('audit_log is immutable'); };
AuditLog.update = immutableError;
AuditLog.destroy = immutableError;

// Layer 2 (instance): blocks instance.update(), instance.destroy(), and instance.save() on
// existing records. The _originalSave capture preserves the initial-insert path used by
// Model.create() / logAudit (isNewRecord=true) while blocking post-insert saves.
const _originalSave = AuditLog.prototype.save;

AuditLog.prototype.update = function () {
  throw new Error('audit_log is immutable: instance.update() forbidden');
};

AuditLog.prototype.destroy = function () {
  throw new Error('audit_log is immutable: instance.destroy() forbidden');
};

AuditLog.prototype.save = function (...args) {
  if (this.isNewRecord) {
    return typeof _originalSave === 'function'
      ? _originalSave.apply(this, args)
      : Promise.resolve(this);
  }
  throw new Error('audit_log is immutable: instance.save() on existing record forbidden');
};

export default AuditLog;
