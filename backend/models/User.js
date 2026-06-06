import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import bcrypt from 'bcryptjs';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  role: {
    type: DataTypes.ENUM('admin', 'reception', 'teacher', 'parent', 'government', 'business'),
    defaultValue: 'parent',
    allowNull: false,
  },
  // For Reception: document verification status
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  // For Reception: whether documents are approved by Admin
  documentsApproved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  // For Reception: whether account is active (can login)
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  // Account lifecycle status — canonical suspension/archival flag (T2-2).
  // Coexists with isActive during migration period; isActive will be retired in a future sprint.
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'active',
    validate: { isIn: [['active', 'suspended', 'archived']] },
  },
  avatar: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  notificationPreferences: {
    type: DataTypes.JSONB,
    defaultValue: {
      email: true,
      push: false,
    },
  },
  // For Parents: assigned teacher and group
  teacherId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  groupId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'groups',
      key: 'id',
    },
  },
  // Track which reception user created this account (for teachers and parents)
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  // School assignment — every user belongs to a school (except government users)
  schoolId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'schools',
      key: 'id',
    },
  },
  // Government role fields — null for all non-government roles.
  govLevel: {
    type: DataTypes.STRING(20),
    allowNull: true,
    validate: { isIn: [['republic', 'region']] },
  },
  govType: {
    type: DataTypes.STRING(20),
    allowNull: true,
    validate: { isIn: [['main', 'secondary']] },
  },
  govRegionId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  govAccessGrants: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  mustChangePassword: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  // Teacher rating system
  rating: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 5,
    },
  },
  totalRatings: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  // G4 of BETA-LAUNCH-PLAN — when the user accepted the platform's privacy
  // disclosure (group-wide media + AI-translated UI). NULL = never consented,
  // so the parent portal forces the modal on first login. See migration
  // 20260606000002 and docs/PRIVACY_POSTURE.md.
  privacyConsentedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'users',
  timestamps: true,
  paranoid: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    },
  },
});

// Instance method to compare password
User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to remove password from JSON
User.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.password;
  return values;
};

// Named scopes — use User.scope('active') or User.scope(['active', { method: ['bySchool', schoolId] }])
User.addScope('active', { where: { isActive: true } });
User.addScope('bySchool', (schoolId) => ({ where: { schoolId } }));
User.addScope('teachers', { where: { role: 'teacher', isActive: true } });
User.addScope('parents', { where: { role: 'parent' } });

export default User;

