import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const EmotionalMonitoring = sequelize.define('EmotionalMonitoring', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  childId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'children',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  teacherId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  // Emotional state indicators (from the form)
  emotionalState: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      stable: false,
      positiveEmotions: false,
      noAnxiety: false,
      noHostility: false,
      calmResponse: false,
      showsEmpathy: false,
      quickRecovery: false,
      stableMood: false,
      trustingRelationship: false,
    },
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  teacherSignature: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
}, {
  tableName: 'emotional_monitoring',
  timestamps: true,
  paranoid: true,
  indexes: [
    {
      fields: ['childId', 'date'],
      unique: true,
      name: 'unique_child_date',
    },
    {
      fields: ['teacherId'],
    },
    {
      fields: ['date'],
    },
  ],
});

// Note: Associations are defined in models/index.js to avoid circular dependencies

export default EmotionalMonitoring;
