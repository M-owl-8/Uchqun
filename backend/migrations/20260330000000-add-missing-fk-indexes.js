/**
 * Migration: Add missing foreign key indexes for performance.
 * Addresses audit finding 3.1 — 13 models missing FK indexes.
 */
export async function up(queryInterface) {
  const indexes = [
    { table: 'children', fields: ['school_id'], name: 'idx_children_school_id' },
    { table: 'children', fields: ['group_id'], name: 'idx_children_group_id' },
    { table: 'documents', fields: ['user_id'], name: 'idx_documents_user_id' },
    { table: 'documents', fields: ['reviewed_by'], name: 'idx_documents_reviewed_by' },
    { table: 'parent_activities', fields: ['parent_id'], name: 'idx_parent_activities_parent_id' },
    { table: 'parent_meals', fields: ['parent_id'], name: 'idx_parent_meals_parent_id' },
    { table: 'parent_media', fields: ['parent_id'], name: 'idx_parent_media_parent_id' },
    { table: 'activities', fields: ['child_id'], name: 'idx_activities_child_id' },
    { table: 'users', fields: ['teacher_id'], name: 'idx_users_teacher_id' },
    { table: 'users', fields: ['group_id'], name: 'idx_users_group_id' },
    { table: 'users', fields: ['created_by'], name: 'idx_users_created_by' },
    { table: 'chat_messages', fields: ['sender_id'], name: 'idx_chat_messages_sender_id' },
    { table: 'teacher_responsibilities', fields: ['teacher_id'], name: 'idx_teacher_responsibilities_teacher_id' },
    { table: 'teacher_tasks', fields: ['teacher_id'], name: 'idx_teacher_tasks_teacher_id' },
    { table: 'teacher_work_histories', fields: ['teacher_id'], name: 'idx_teacher_work_histories_teacher_id' },
  ];

  for (const idx of indexes) {
    try {
      await queryInterface.addIndex(idx.table, idx.fields, { name: idx.name });
    } catch (err) {
      if (err.message && (err.message.includes('already exists') || err.message.includes('does not exist'))) {
        // Index already exists or column not yet added — skip
      } else {
        throw err;
      }
    }
  }
}

export async function down(queryInterface) {
  const indexNames = [
    'idx_children_school_id', 'idx_children_group_id',
    'idx_documents_user_id', 'idx_documents_reviewed_by',
    'idx_parent_activities_parent_id', 'idx_parent_meals_parent_id',
    'idx_parent_media_parent_id', 'idx_activities_child_id',
    'idx_users_teacher_id', 'idx_users_group_id', 'idx_users_created_by',
    'idx_chat_messages_sender_id',
    'idx_teacher_responsibilities_teacher_id', 'idx_teacher_tasks_teacher_id',
    'idx_teacher_work_histories_teacher_id',
  ];

  for (const name of indexNames) {
    try {
      await queryInterface.removeIndex(name.split('_').slice(1, -1).join('_') + 's', name);
    } catch {
      // Ignore if index doesn't exist
    }
  }
}
