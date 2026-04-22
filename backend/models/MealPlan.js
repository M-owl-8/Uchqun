import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const MealPlan = sequelize.define('MealPlan', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  childId: { type: DataTypes.UUID, allowNull: false, field: 'child_id', references: { model: 'children', key: 'id' }, onDelete: 'CASCADE' },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  mealType: {
    type: DataTypes.ENUM('breakfast', 'lunch', 'snack', 'dinner'),
    allowNull: false,
    field: 'meal_type',
  },
  plannedMenu: { type: DataTypes.TEXT, allowNull: false, field: 'planned_menu' },
  notes: { type: DataTypes.TEXT, allowNull: true },
  createdBy: { type: DataTypes.UUID, allowNull: true, field: 'created_by', references: { model: 'users', key: 'id' } },
}, {
  tableName: 'meal_plans',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['child_id', 'date', 'meal_type'], unique: true },
    { fields: ['child_id'] },
    { fields: ['date'] },
  ],
});

export default MealPlan;
