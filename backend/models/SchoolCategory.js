import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const SchoolCategory = sequelize.define('SchoolCategory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
}, {
  tableName: 'school_categories',
  timestamps: true,
  paranoid: false,
});

export default SchoolCategory;
