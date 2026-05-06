/**
 * Migration 20260330000000-add-missing-fk-indexes used snake_case column
 * names (school_id, group_id, …) which don't match the Sequelize models
 * (schoolId, groupId, …). The original migration's try/catch silently
 * swallowed the "column does not exist" errors, so the FK indexes were
 * never created. This migration adds them with the correct casing.
 */
export async function up(queryInterface) {
  const indexes = [
    { table: 'children', fields: ['schoolId'], name: 'idx_children_schoolId' },
    { table: 'children', fields: ['groupId'], name: 'idx_children_groupId' },
    { table: 'documents', fields: ['userId'], name: 'idx_documents_userId' },
    { table: 'documents', fields: ['reviewedBy'], name: 'idx_documents_reviewedBy' },
    { table: 'parent_activities', fields: ['parentId'], name: 'idx_parent_activities_parentId' },
    { table: 'parent_meals', fields: ['parentId'], name: 'idx_parent_meals_parentId' },
    { table: 'parent_media', fields: ['parentId'], name: 'idx_parent_media_parentId' },
    { table: 'activities', fields: ['childId'], name: 'idx_activities_childId' },
    { table: 'users', fields: ['teacherId'], name: 'idx_users_teacherId' },
    { table: 'users', fields: ['groupId'], name: 'idx_users_groupId' },
    { table: 'users', fields: ['schoolId'], name: 'idx_users_schoolId' },
    { table: 'users', fields: ['createdBy'], name: 'idx_users_createdBy' },
    { table: 'chat_messages', fields: ['senderId'], name: 'idx_chat_messages_senderId' },
    { table: 'chat_messages', fields: ['conversationId', 'createdAt'], name: 'idx_chat_messages_conversationId_createdAt' },
    { table: 'teacher_responsibilities', fields: ['teacherId'], name: 'idx_teacher_responsibilities_teacherId' },
    { table: 'teacher_tasks', fields: ['teacherId'], name: 'idx_teacher_tasks_teacherId' },
    { table: 'teacher_work_history', fields: ['teacherId'], name: 'idx_teacher_work_history_teacherId' },
  ];

  for (const idx of indexes) {
    try {
      await queryInterface.addIndex(idx.table, idx.fields, { name: idx.name });
    } catch (err) {
      const m = err.message || '';
      if (m.includes('already exists') || m.includes('does not exist')) continue;
      throw err;
    }
  }
}

export async function down(queryInterface) {
  const all = [
    ['children', 'idx_children_schoolId'],
    ['children', 'idx_children_groupId'],
    ['documents', 'idx_documents_userId'],
    ['documents', 'idx_documents_reviewedBy'],
    ['parent_activities', 'idx_parent_activities_parentId'],
    ['parent_meals', 'idx_parent_meals_parentId'],
    ['parent_media', 'idx_parent_media_parentId'],
    ['activities', 'idx_activities_childId'],
    ['users', 'idx_users_teacherId'],
    ['users', 'idx_users_groupId'],
    ['users', 'idx_users_schoolId'],
    ['users', 'idx_users_createdBy'],
    ['chat_messages', 'idx_chat_messages_senderId'],
    ['chat_messages', 'idx_chat_messages_conversationId_createdAt'],
    ['teacher_responsibilities', 'idx_teacher_responsibilities_teacherId'],
    ['teacher_tasks', 'idx_teacher_tasks_teacherId'],
    ['teacher_work_history', 'idx_teacher_work_history_teacherId'],
  ];
  for (const [table, name] of all) {
    try {
      await queryInterface.removeIndex(table, name);
    } catch { /* ignore */ }
  }
}
