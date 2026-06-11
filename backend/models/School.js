import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const School = sequelize.define('School', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  slug: {
    type: DataTypes.STRING(32),
    allowNull: false,
    unique: true,
    validate: {
      // Same contract as the old /^[a-z0-9]([a-z0-9-]{0,30}[a-z0-9])?$/ but
      // written without the nested optional group that eslint
      // security/detect-unsafe-regex flagged: single bounded class + an
      // explicit trailing-hyphen check is linear-time by construction.
      isSlug(value) {
        if (!/^[a-z0-9][a-z0-9-]{0,31}$/.test(value) || value.endsWith('-')) {
          throw new Error('slug must be 1-32 lowercase alphanumeric/hyphen chars, starting and ending alphanumeric');
        }
      },
    },
  },
  type: {
    type: DataTypes.STRING(32),
    defaultValue: 'support',
    allowNull: false,
    validate: {
      isIn: [['daycare', 'early_preschool', 'support', 'early_intervention', 'home_care']],
    },
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  phone: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  region: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  city: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  director: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
  },
  // CP-021: region FK. Null until PL-015 data-swap (Sprint D).
  // requireRegionScope uses this for isolation; region string field is display-only.
  regionId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  // CP-021: district FK. Metadata-only; not used for auth enforcement.
  districtId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  // CP-021 Sprint D: care-type category FK. Null until assigned by government.
  // Only republic-main or region-main (own region) may set this via PUT /government/schools/:id/category.
  categoryId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'schools',
  timestamps: true,
  indexes: [
    { fields: ['name'] },
    { fields: ['type'] },
    { fields: ['isActive'] },
  ],
});

export default School;
