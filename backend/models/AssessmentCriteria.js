import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

// Seed table — populated from shared/config/assessmentCriteria.js.
// Idempotent re-seed via scripts/seedAssessmentCriteria.js.
// levelDescriptions stored in SOFTWARE direction: key "4" = best, key "0" = worst.
// softwareScore = 4 − printedScore (see IRR-DECISIONS.md for inversion rationale).
const AssessmentCriteria = sequelize.define('AssessmentCriteria', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  textUz: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  textRu: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  textEn: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  isHearingSpecific: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  levelDescriptions: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
  scoringType: {
    type: DataTypes.ENUM('ability', 'frequency', 'participation'),
    allowNull: false,
    defaultValue: 'ability',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
}, {
  tableName: 'assessment_criteria',
  timestamps: true,
  paranoid: false,
});

export default AssessmentCriteria;
