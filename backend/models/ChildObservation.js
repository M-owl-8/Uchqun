import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ChildObservation = sequelize.define('ChildObservation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  childId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'children', key: 'id' },
    onDelete: 'SET NULL',
  },
  teacherId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'SET NULL',
  },
  schoolId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'schools', key: 'id' },
    onDelete: 'RESTRICT',
  },
  observationDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  domain: {
    type: DataTypes.ENUM('communication', 'motor', 'social', 'cognitive', 'self_care'),
    allowNull: false,
  },
  note: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  severity: {
    type: DataTypes.ENUM('routine', 'concern', 'urgent'),
    allowNull: false,
    defaultValue: 'routine',
  },
  childSnapshot: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
}, {
  tableName: 'child_observations',
  timestamps: true,
  paranoid: true,
});

export default ChildObservation;
