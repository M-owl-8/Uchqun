'use strict';

/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('parent_evaluations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      parent_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      teacher_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      school_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'schools', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      period: {
        type: Sequelize.ENUM('daily', 'weekly', 'monthly'),
        allowNull: false,
      },
      answers: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      submitted_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    await queryInterface.addIndex('parent_evaluations', ['parent_id']);
    await queryInterface.addIndex('parent_evaluations', ['teacher_id']);
    await queryInterface.addIndex('parent_evaluations', ['school_id']);
    await queryInterface.addIndex('parent_evaluations', ['period']);
    await queryInterface.addIndex('parent_evaluations', ['submitted_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('parent_evaluations');
  },
};
