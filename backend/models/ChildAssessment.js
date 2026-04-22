import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ChildAssessment = sequelize.define('ChildAssessment', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  childId: { type: DataTypes.UUID, allowNull: false, field: 'child_id', references: { model: 'children', key: 'id' }, onDelete: 'CASCADE' },
  teacherId: { type: DataTypes.UUID, allowNull: false, field: 'teacher_id', references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
  date: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
  category: {
    type: DataTypes.ENUM('cognitive', 'motor', 'speech', 'behavior', 'social', 'self_care'),
    allowNull: false,
  },
  score: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 5 } },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'child_assessments',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['child_id'] },
    { fields: ['teacher_id'] },
    { fields: ['child_id', 'category', 'date'], unique: true },
  ],
});

export default ChildAssessment;
