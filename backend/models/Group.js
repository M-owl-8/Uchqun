import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import User from './User.js';

const Group = sequelize.define('Group', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  teacherId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 20,
    validate: {
      min: 1,
      max: 100,
    },
  },
  ageRange: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  schoolId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'schools',
      key: 'id',
    },
  },
}, {
  tableName: 'groups',
  timestamps: true,
  indexes: [
    {
      fields: ['teacherId'],
    },
    {
      fields: ['name'],
    },
  ],
});

// Define associations
Group.belongsTo(User, { foreignKey: 'teacherId', as: 'teacher' });
User.hasMany(Group, { foreignKey: 'teacherId', as: 'groups' });

export default Group;



