import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const AdminRegistrationRequest = sequelize.define('AdminRegistrationRequest', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  certificateFile: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  passportFile: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  passportNumber: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  passportSeries: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  region: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  telegramUsername: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Telegram username (without @) - required field',
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
    allowNull: false,
  },
  reviewedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  reviewedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  approvedUserId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  schoolId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'schools',
      key: 'id',
    },
  },
}, {
  tableName: 'admin_registration_requests',
  timestamps: true,
  indexes: [
    { fields: ['email'] },
    { fields: ['status'] },
    { fields: ['reviewedBy'] },
    { fields: ['createdAt'] },
  ],
});

export default AdminRegistrationRequest;
