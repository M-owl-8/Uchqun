export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('audit_log', {
    id: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    actorId: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    actorRole: {
      type: Sequelize.STRING(30),
      allowNull: false,
    },
    action: {
      type: Sequelize.STRING(100),
      allowNull: false,
    },
    entity: {
      type: Sequelize.STRING(100),
      allowNull: false,
    },
    entityId: {
      type: Sequelize.UUID,
      allowNull: true,
    },
    schoolId: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'schools', key: 'id' },
      onDelete: 'SET NULL',
    },
    meta: {
      type: Sequelize.JSONB,
      allowNull: true,
    },
    occurredAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
  });

  await queryInterface.addIndex('audit_log', ['actorId'], { name: 'audit_log_actor_id_idx' });
  await queryInterface.addIndex('audit_log', ['entity', 'entityId'], { name: 'audit_log_entity_idx' });
  await queryInterface.addIndex('audit_log', ['schoolId'], { name: 'audit_log_school_id_idx' });
  await queryInterface.addIndex('audit_log', ['occurredAt'], { name: 'audit_log_occurred_at_idx' });
}

export async function down(queryInterface) {
  await queryInterface.dropTable('audit_log');
}
