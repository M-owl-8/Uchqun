'use strict';

/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('child_assessments', {
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
      teacher_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      category: {
        type: Sequelize.ENUM('cognitive', 'motor', 'speech', 'behavior', 'social', 'self_care'),
        allowNull: false,
      },
      score: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
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
    await queryInterface.addIndex('child_assessments', ['child_id']);
    await queryInterface.addIndex('child_assessments', ['teacher_id']);
    await queryInterface.addIndex('child_assessments', ['child_id', 'category', 'date'], {
      unique: true,
      name: 'child_assessments_child_category_date_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('child_assessments');
  },
};
