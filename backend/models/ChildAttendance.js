import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ChildAttendance = sequelize.define('ChildAttendance', {
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
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('present', 'absent', 'late', 'excused'),
    allowNull: false,
  },
  note: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  markedBy: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  childSnapshot: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
}, {
  tableName: 'child_attendance',
  timestamps: true,
  paranoid: true,
});

export default ChildAttendance;
