import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const TeacherReflection = sequelize.define('TeacherReflection', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  teacherId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  schoolId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, {
  tableName: 'teacher_reflections',
  timestamps: true,
  paranoid: true,
});

export default TeacherReflection;
