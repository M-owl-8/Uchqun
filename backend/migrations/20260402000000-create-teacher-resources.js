'use strict';

/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('teacher_resources', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      teacher_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      school_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'schools', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      type: {
        type: Sequelize.ENUM('music', 'video', 'recommendation'),
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      url: {
        type: Sequelize.STRING(1000),
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    // Add indexes
    await queryInterface.addIndex('teacher_resources', ['teacher_id']);
    await queryInterface.addIndex('teacher_resources', ['type']);
    await queryInterface.addIndex('teacher_resources', ['school_id', 'type']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('teacher_resources');
  },
};
