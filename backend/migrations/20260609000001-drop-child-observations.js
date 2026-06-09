'use strict';

/**
 * Drops the child_observations table.
 *
 * The "kuzatuv" feature was removed in its entirety — the form was broken
 * (frontend/backend field mismatch), parents never saw the data, and the
 * IRR daily/weekly monitoring entries already cover the clinical
 * record-keeping need.
 *
 * Down migration recreates the original table shape so dev rollback works,
 * but production rollback is not supported (deleted rows are not restored).
 */
export default {
  async up(queryInterface) {
    await queryInterface.dropTable('child_observations');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.createTable('child_observations', {
      id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      childId: { type: Sequelize.UUID, allowNull: true, references: { model: 'children', key: 'id' }, onDelete: 'SET NULL' },
      teacherId: { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      schoolId: { type: Sequelize.UUID, allowNull: false, references: { model: 'schools', key: 'id' }, onDelete: 'RESTRICT' },
      observationDate: { type: Sequelize.DATEONLY, allowNull: false },
      domain: { type: Sequelize.ENUM('communication', 'motor', 'social', 'cognitive', 'self_care'), allowNull: false },
      severity: { type: Sequelize.ENUM('routine', 'concern', 'urgent'), allowNull: false, defaultValue: 'routine' },
      note: { type: Sequelize.TEXT, allowNull: false },
      childSnapshot: { type: Sequelize.JSONB, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
      deletedAt: { type: Sequelize.DATE, allowNull: true },
    });
  },
};
