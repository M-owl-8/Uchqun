import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ChatMessage = sequelize.define('ChatMessage', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  conversationId: { type: DataTypes.STRING(128), allowNull: false },
  senderId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  senderRole: {
    type: DataTypes.ENUM('parent', 'teacher'),
    allowNull: false,
  },
  content: { type: DataTypes.TEXT, allowNull: false },
  readByParent: { type: DataTypes.BOOLEAN, defaultValue: false },
  readByTeacher: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  tableName: 'chat_messages',
  timestamps: true,
  paranoid: true,
  indexes: [
    { fields: ['conversationId'] },
    { fields: ['senderId'] },
  ],
});

export default ChatMessage;
