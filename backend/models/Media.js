import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import Child from './Child.js';
import Activity from './Activity.js';

const Media = sequelize.define('Media', {
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
  activityId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'activities', key: 'id' },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  type: { type: DataTypes.ENUM('photo', 'video'), allowNull: false },
  url: { type: DataTypes.TEXT, allowNull: false },
  thumbnail: { type: DataTypes.TEXT, allowNull: true },
  title: { type: DataTypes.STRING(500), allowNull: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'media',
  timestamps: true,
  paranoid: true,
  indexes: [
    { fields: ['childId', 'date'] },
    { fields: ['type'] },
    { fields: ['activityId'] },
  ],
});

Media.belongsTo(Child, { foreignKey: 'childId', as: 'child' });
Media.belongsTo(Activity, { foreignKey: 'activityId', as: 'activity' });
Child.hasMany(Media, { foreignKey: 'childId', as: 'media' });
Activity.hasMany(Media, { foreignKey: 'activityId', as: 'media' });

export default Media;
