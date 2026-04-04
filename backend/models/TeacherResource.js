import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const TeacherResource = sequelize.define('TeacherResource', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  teacherId: { type: DataTypes.UUID, allowNull: false },
  schoolId: { type: DataTypes.UUID, allowNull: true },
  type: { type: DataTypes.ENUM('music', 'video', 'recommendation'), allowNull: false },
  title: { type: DataTypes.STRING(500), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  url: { type: DataTypes.STRING(1000), allowNull: true },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'teacher_resources',
  timestamps: true,
  indexes: [
    { fields: ['teacherId'] },
    { fields: ['type'] },
    { fields: ['schoolId', 'type'] },
  ],
});

export default TeacherResource;
