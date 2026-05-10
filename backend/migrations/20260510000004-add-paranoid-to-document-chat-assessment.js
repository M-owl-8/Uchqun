// #03-014 — add soft-delete columns to document, chat_messages, child_assessments
export async function up(queryInterface, Sequelize) {
  const addIfMissing = async (table, col) => {
    try {
      await queryInterface.addColumn(table, col, { type: Sequelize.DATE, allowNull: true, defaultValue: null });
    } catch (err) {
      if (!err.message?.includes('already exists')) throw err;
    }
  };
  await addIfMissing('documents',         'deletedAt');
  await addIfMissing('chat_messages',     'deletedAt');
  await addIfMissing('child_assessments', 'deleted_at');
}

export async function down(queryInterface) {
  await queryInterface.removeColumn('documents',         'deletedAt').catch(() => {});
  await queryInterface.removeColumn('chat_messages',     'deletedAt').catch(() => {});
  await queryInterface.removeColumn('child_assessments', 'deleted_at').catch(() => {});
}
