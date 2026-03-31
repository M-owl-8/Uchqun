'use strict';

/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('service_plans', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      child_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'children', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      year: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      service_type: {
        type: Sequelize.ENUM('logoped', 'defektolog', 'self_care', 'ipotherapy', 'music', 'labor', 'tmc', 'physiotherapy'),
        allowNull: false,
      },
      months: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: { jan: false, feb: false, mar: false, apr: false, may: false, jun: false, jul: false, aug: false, sep: false, oct: false, nov: false, dec: false },
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
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
    await queryInterface.addIndex('service_plans', ['child_id']);
    await queryInterface.addIndex('service_plans', ['child_id', 'year', 'service_type'], {
      unique: true,
      name: 'service_plans_child_year_service_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('service_plans');
  },
};
