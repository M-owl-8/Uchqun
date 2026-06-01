import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Region = sequelize.define('Region', {
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
  nameRu: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  nameCyrl: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  isRepublic: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
}, {
  tableName: 'regions',
  timestamps: true,
  paranoid: false,
});

export default Region;
