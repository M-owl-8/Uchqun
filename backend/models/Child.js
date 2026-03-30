import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Child = sequelize.define('Child', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  parentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  dateOfBirth: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  gender: {
    type: DataTypes.ENUM('Male', 'Female', 'Other'),
    allowNull: false,
  },
  disabilityType: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  specialNeeds: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  photo: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  school: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  schoolId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'schools',
      key: 'id',
    },
  },
  class: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  teacher: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  groupId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'groups',
      key: 'id',
    },
  },
  emergencyContact: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
}, {
  tableName: 'children',
  timestamps: true,
  paranoid: true,
});

// Note: All associations are defined in models/index.js
// to avoid circular dependencies and duplicate associations

// Virtual for age (calculated in application layer)
Child.prototype.getAge = function() {
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export default Child;

