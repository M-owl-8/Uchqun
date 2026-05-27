import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const GovernmentSchoolRating = sequelize.define('GovernmentSchoolRating', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  schoolId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'schools', key: 'id' },
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  },
  govUserId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  // Quarter label — e.g. 'Q1-2026', 'Q2-2026'. One rating per gov user per school per quarter.
  period: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  stars: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5,
    },
  },
  indicators: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, {
  tableName: 'government_school_ratings',
  timestamps: true,
  paranoid: true,
  indexes: [
    { fields: ['schoolId'] },
    { fields: ['govUserId'] },
    { unique: true, fields: ['schoolId', 'govUserId', 'period'], where: { deletedAt: null } },
  ],
});

export default GovernmentSchoolRating;
