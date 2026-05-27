import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const GovernmentMessage = sequelize.define('GovernmentMessage', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  senderId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  subject: { type: DataTypes.STRING(500), allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  isRead: { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: false },
  readAt: { type: DataTypes.DATE, allowNull: true },
  reply: { type: DataTypes.TEXT, allowNull: true },
  repliedAt: { type: DataTypes.DATE, allowNull: true },
  // Threading: top-level messages have parentMessageId = null; replies point to their parent.
  parentMessageId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'government_messages', key: 'id' },
    onDelete: 'SET NULL',
  },
  // CP-022: routing level. 'owner' = school admin inbox; 'region' = regional gov;
  // 'republic' = republic-level gov. Legacy rows default to 'republic'.
  recipientLevel: {
    type: DataTypes.ENUM('owner', 'region', 'republic'),
    allowNull: false,
    defaultValue: 'republic',
  },
  // CP-022: escalation chain pointer. If set, this message is an escalation of
  // the referenced message. Parent can only escalate their own prior message.
  escalatedFromId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'government_messages', key: 'id' },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
}, {
  tableName: 'government_messages',
  timestamps: true,
  indexes: [
    { fields: ['senderId'] },
    { fields: ['isRead'] },
    { fields: ['createdAt'] },
    { fields: ['parentMessageId'] },
    { fields: ['recipientLevel'] },
    { fields: ['escalatedFromId'] },
  ],
});

GovernmentMessage.hasMany(GovernmentMessage, { as: 'replies', foreignKey: 'parentMessageId' });
GovernmentMessage.belongsTo(GovernmentMessage, { as: 'parent', foreignKey: 'parentMessageId' });
// Escalation chain: a message can be escalated from a prior message by the same sender.
GovernmentMessage.belongsTo(GovernmentMessage, { as: 'escalatedFrom', foreignKey: 'escalatedFromId' });

export default GovernmentMessage;
