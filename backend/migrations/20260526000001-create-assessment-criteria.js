// Depends on: nothing (seed table, no foreign keys to other new tables)
// Must run BEFORE assessment_scores (which FK-references this table)
export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('assessment_criteria', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
      primaryKey: true,
    },
    sortOrder: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    code: {
      type: Sequelize.STRING(50),
      allowNull: false,
    },
    textUz: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    textRu: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    textEn: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    isHearingSpecific: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    levelDescriptions: {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    scoringType: {
      type: Sequelize.ENUM('ability', 'frequency', 'participation'),
      allowNull: false,
      defaultValue: 'ability',
    },
    isActive: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    createdAt: { type: Sequelize.DATE, allowNull: false },
    updatedAt: { type: Sequelize.DATE, allowNull: false },
  });

  await queryInterface.addIndex('assessment_criteria', ['code'], {
    unique: true,
    name: 'idx_assessment_criteria_code_unique',
  });
  await queryInterface.addIndex('assessment_criteria', ['sortOrder'], {
    name: 'idx_assessment_criteria_sort_order',
  });
  await queryInterface.addIndex('assessment_criteria', ['isActive'], {
    name: 'idx_assessment_criteria_is_active',
  });
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('assessment_criteria');
  await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_assessment_criteria_scoringType"`);
};
