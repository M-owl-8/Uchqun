import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ImportJob = sequelize.define('ImportJob', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  schoolId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  filename: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('ready', 'importing', 'completed', 'failed'),
    allowNull: false,
    defaultValue: 'ready',
  },
  totalRows: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  validRows: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  invalidRows: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  errors: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
  },
  rawCsv: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, {
  tableName: 'import_jobs',
  timestamps: true,
  paranoid: true,
});

export default ImportJob;
