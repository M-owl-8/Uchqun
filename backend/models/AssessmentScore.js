import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

// One row per criterion per assessment session.
// score is in SOFTWARE direction: 4 = best, 0 = worst (inverted from printed standard).
// CHECK constraint (score 0–4) is enforced at the DB layer in the migration.
const AssessmentScore = sequelize.define('AssessmentScore', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  sessionId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'assessment_sessions', key: 'id' },
    onDelete: 'CASCADE',
  },
  criterionId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'assessment_criteria', key: 'id' },
    onDelete: 'RESTRICT',
  },
  score: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 0, max: 4 },
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'assessment_scores',
  timestamps: true,
  paranoid: false,
});

export default AssessmentScore;
