import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import Child from './Child.js';

const Progress = sequelize.define('Progress', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  childId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: { model: 'children', key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  academic: { type: DataTypes.JSONB, defaultValue: {} },
  social: { type: DataTypes.JSONB, defaultValue: {} },
  behavioral: { type: DataTypes.JSONB, defaultValue: {} },
}, {
  tableName: 'progress',
  timestamps: true,
  paranoid: true,
});

Progress.belongsTo(Child, { foreignKey: 'childId', as: 'child' });
Child.hasOne(Progress, { foreignKey: 'childId', as: 'progress' });

export default Progress;
