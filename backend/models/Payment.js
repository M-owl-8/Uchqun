import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Payment = sequelize.define('Payment', {
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
  },
  childId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'children',
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
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0,
    },
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'UZS',
    allowNull: false,
  },
  paymentType: {
    type: DataTypes.ENUM('tuition', 'therapy', 'meal', 'activity', 'other'),
    allowNull: false,
  },
  paymentMethod: {
    type: DataTypes.ENUM('card', 'bank_transfer', 'cash', 'mobile_payment', 'online', 'other'),
    allowNull: false,
  },
  paymentProvider: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  transactionId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: true,
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'),
    defaultValue: 'pending',
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  paidAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  receiptUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  refundAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  refundedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  refundReason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'payments',
  timestamps: true,
  indexes: [
    { fields: ['parentId'] },
    { fields: ['childId'] },
    { fields: ['schoolId'] },
    { fields: ['status'] },
    { fields: ['paymentType'] },
    { fields: ['transactionId'] },
    { fields: ['paidAt'] },
  ],
});

export default Payment;
