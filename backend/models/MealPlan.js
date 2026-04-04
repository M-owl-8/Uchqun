import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const MealPlan = sequelize.define('MealPlan', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  childId: { type: DataTypes.UUID, allowNull: false, references: { model: 'children', key: 'id' }, onDelete: 'CASCADE' },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  mealType: {
    type: DataTypes.ENUM('breakfast', 'lunch', 'snack', 'dinner'),
    allowNull: false,
  },
  plannedMenu: { type: DataTypes.TEXT, allowNull: false },
  notes: { type: DataTypes.TEXT, allowNull: true },
  createdBy: { type: DataTypes.UUID, allowNull: true, references: { model: 'users', key: 'id' } },
}, {
  tableName: 'meal_plans',
  timestamps: true,
  indexes: [
    { fields: ['childId', 'date', 'mealType'], unique: true },
    { fields: ['childId'] },
    { fields: ['date'] },
  ],
});

export default MealPlan;
