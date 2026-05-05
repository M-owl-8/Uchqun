import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const TeacherRating = sequelize.define('TeacherRating', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  teacherId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  parentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  stars: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 5 },
  },
  comment: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'teacher_ratings',
  timestamps: true,
  paranoid: true,
  indexes: [
    { fields: ['teacherId'] },
    { unique: true, fields: ['teacherId', 'parentId'] },
  ],
});

export default TeacherRating;
