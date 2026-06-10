'use strict';

/**
 * IRR-MONTHLY-MILESTONES (Option B) — new table for per-month projected
 * milestones attached to long-term goals.
 *
 * Unique constraint on (longTermGoalId, monthNumber): at most one milestone
 * per goal per month within the IRR's 12-month window.
 */
export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('monthly_milestones', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      irrId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'irrs', key: 'id' },
        onDelete: 'CASCADE',
      },
      longTermGoalId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'long_term_goals', key: 'id' },
        onDelete: 'CASCADE',
      },
      childId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'children', key: 'id' },
        onDelete: 'SET NULL',
      },
      schoolId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'schools', key: 'id' },
        onDelete: 'RESTRICT',
      },
      monthNumber: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      targetText: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('planned', 'achieved', 'partial', 'missed'),
        allowNull: false,
        defaultValue: 'planned',
      },
      actualText: { type: Sequelize.TEXT, allowNull: true },
      assessedAt: { type: Sequelize.DATEONLY, allowNull: true },
      assessedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
      },
      notes: { type: Sequelize.TEXT, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('monthly_milestones', ['irrId'], { name: 'mm_irr_idx' });
    await queryInterface.addIndex('monthly_milestones', ['longTermGoalId'], { name: 'mm_ltg_idx' });
    await queryInterface.addIndex('monthly_milestones', ['childId', 'monthNumber'], { name: 'mm_child_month_idx' });
    await queryInterface.addIndex('monthly_milestones', ['schoolId'], { name: 'mm_school_idx' });
    await queryInterface.addIndex('monthly_milestones', ['longTermGoalId', 'monthNumber'], {
      unique: true,
      name: 'mm_ltg_month_unique',
    });

    // CHECK constraint: monthNumber between 1 and 12.
    await queryInterface.sequelize.query(
      `ALTER TABLE monthly_milestones
       ADD CONSTRAINT mm_month_range_check
       CHECK ("monthNumber" >= 1 AND "monthNumber" <= 12)`
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('monthly_milestones');
    // ENUM is dropped automatically with the table in Postgres for inline enums.
  },
};
