import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ChildJournalEntry = sequelize.define('ChildJournalEntry', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  childId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  teacherId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  schoolId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  isVisibleToParent: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  childSnapshot: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
}, {
  tableName: 'child_journal_entries',
  timestamps: true,
  paranoid: true,
});

export default ChildJournalEntry;
