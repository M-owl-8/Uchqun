import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const IRR = sequelize.define('IRR', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  childId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'children', key: 'id' },
    onDelete: 'SET NULL',
  },
  schoolId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'schools', key: 'id' },
    onDelete: 'RESTRICT',
  },
  parentId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'SET NULL',
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'SET NULL',
  },
  status: {
    type: DataTypes.ENUM('draft', 'active', 'archived'),
    allowNull: false,
    defaultValue: 'draft',
  },
  // Header fields (mandatory before activating)
  childFullName: {
    type: DataTypes.STRING(200),
    allowNull: true,
  },
  dateOfBirth: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  ageAtAssessmentStart: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  ptpkIntakeDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  ptpkConclusionDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  ptpkConclusionNumber: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  ptpkDiagnosis: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  ptpkNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  irrStartDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  additionalInfo: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // Needs assessment (advisory — not a hard gate per OQ-9)
  childStrengths: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  riskFactors: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'irrs',
  timestamps: true,
  paranoid: true,
});

export default IRR;
