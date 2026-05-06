import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const SchoolRating = sequelize.define('SchoolRating', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  schoolId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'schools', key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  parentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  stars: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      isValidStars(value) {
        if (value === null || value === undefined) return true;
        const num = Number(value);
        if (isNaN(num) || !Number.isInteger(num)) throw new Error('Stars must be an integer');
        if (num < 1 || num > 5) throw new Error('Stars must be between 1 and 5');
        return true;
      },
    },
  },
  numericRating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      isValidNumericRating(value) {
        if (value === null || value === undefined) return true;
        const num = Number(value);
        if (isNaN(num) || !Number.isInteger(num)) throw new Error('Numeric rating must be an integer');
        if (num < 1 || num > 10) throw new Error('Numeric rating must be between 1 and 10');
        return true;
      },
    },
  },
  evaluation: { type: DataTypes.JSONB, allowNull: true },
  comment: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'school_ratings',
  timestamps: true,
  paranoid: true,
  indexes: [
    { fields: ['schoolId'] },
    { unique: true, fields: ['schoolId', 'parentId'] },
  ],
});

export default SchoolRating;
