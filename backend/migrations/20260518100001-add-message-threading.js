export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn('government_messages', 'parentMessageId', {
    type: Sequelize.UUID,
    allowNull: true,
    references: { model: 'government_messages', key: 'id' },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  });
  await queryInterface.addIndex('government_messages', ['parentMessageId'], {
    name: 'government_messages_parent_message_id',
  });
}

export async function down(queryInterface) {
  await queryInterface.removeIndex('government_messages', 'government_messages_parent_message_id');
  await queryInterface.removeColumn('government_messages', 'parentMessageId');
}
