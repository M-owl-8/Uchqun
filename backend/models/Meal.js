import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Meal = sequelize.define('Meal', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  childId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'children', key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  mealType: {
    type: DataTypes.ENUM('Breakfast', 'Lunch', 'Snack', 'Dinner'),
    allowNull: false,
  },
  mealName: { type: DataTypes.STRING(500), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  quantity: { type: DataTypes.STRING(255), allowNull: true },
  specialNotes: { type: DataTypes.TEXT, allowNull: true },
  time: { type: DataTypes.TIME, allowNull: true },
  eaten: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'meals',
  timestamps: true,
  paranoid: true,
  indexes: [{ fields: ['childId', 'date'] }],
});

// Associations are declared in models/index.js

export default Meal;
