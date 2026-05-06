/**
 * Migration: Create EmotionalMonitoring table
 * Date: 2026-01-15
 * Description: Creates table for weekly emotional monitoring journal entries
 */

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('emotional_monitoring', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    childId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'children',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    teacherId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    date: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    emotionalState: {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: {
        stable: false,
        positiveEmotions: false,
        noAnxiety: false,
        noHostility: false,
        calmResponse: false,
        showsEmpathy: false,
        quickRecovery: false,
        stableMood: false,
        trustingRelationship: false,
      },
    },
    notes: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    teacherSignature: {
      type: Sequelize.STRING(500),
      allowNull: true,
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('NOW'),
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('NOW'),
    },
  });

  // Create unique index for childId and date combination
  try {
    await queryInterface.addIndex('emotional_monitoring', {
      fields: ['childId', 'date'],
      unique: true,
      name: 'unique_child_date',
      ifNotExists: true,
    });
  } catch (error) {
    if (!error.message.includes('already exists')) {
      throw error;
    }
  }

  // Create index for teacherId
  try {
    await queryInterface.addIndex('emotional_monitoring', {
      fields: ['teacherId'],
      name: 'idx_emotional_monitoring_teacher_id',
      ifNotExists: true,
    });
  } catch (error) {
    if (!error.message.includes('already exists')) {
      throw error;
    }
  }

  // Create index for date
  try {
    await queryInterface.addIndex('emotional_monitoring', {
      fields: ['date'],
      name: 'idx_emotional_monitoring_date',
      ifNotExists: true,
    });
  } catch (error) {
    if (!error.message.includes('already exists')) {
      throw error;
    }
  }
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('emotional_monitoring');
}
