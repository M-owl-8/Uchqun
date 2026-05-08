/**
 * Fix FK indexes: the prior migration (20260330000000-add-missing-fk-indexes.js)
 * used snake_case column names (teacher_id, group_id, etc.) but Sequelize creates
 * camelCase columns by default. This migration drops the invalid indexes and
 * creates them against the correct column names.
 *
 * Audit finding H-13.
 */

const OLD_INDEXES = [
  { table: 'users', name: 'idx_users_teacher_id' },
  { table: 'users', name: 'idx_users_group_id' },
  { table: 'users', name: 'idx_users_created_by' },
  { table: 'children', name: 'idx_children_school_id' },
  { table: 'children', name: 'idx_children_group_id' },
  { table: 'documents', name: 'idx_documents_user_id' },
  { table: 'documents', name: 'idx_documents_reviewed_by' },
  { table: 'parent_activities', name: 'idx_parent_activities_parent_id' },
  { table: 'parent_meals', name: 'idx_parent_meals_parent_id' },
  { table: 'parent_media', name: 'idx_parent_media_parent_id' },
  { table: 'activities', name: 'idx_activities_child_id' },
  { table: 'chat_messages', name: 'idx_chat_messages_sender_id' },
  { table: 'teacher_responsibilities', name: 'idx_teacher_responsibilities_teacher_id' },
  { table: 'teacher_tasks', name: 'idx_teacher_tasks_teacher_id' },
  { table: 'teacher_work_history', name: 'idx_teacher_work_history_teacher_id' },
];

const NEW_INDEXES = [
  { table: 'users', fields: ['teacherId'], name: 'idx_users_teacherId' },
  { table: 'users', fields: ['groupId'], name: 'idx_users_groupId' },
  { table: 'users', fields: ['createdBy'], name: 'idx_users_createdBy' },
  { table: 'children', fields: ['schoolId'], name: 'idx_children_schoolId' },
  { table: 'children', fields: ['groupId'], name: 'idx_children_groupId' },
  { table: 'documents', fields: ['userId'], name: 'idx_documents_userId' },
  { table: 'documents', fields: ['reviewedBy'], name: 'idx_documents_reviewedBy' },
  { table: 'parent_activities', fields: ['parentId'], name: 'idx_parent_activities_parentId' },
  { table: 'parent_meals', fields: ['parentId'], name: 'idx_parent_meals_parentId' },
  { table: 'parent_media', fields: ['parentId'], name: 'idx_parent_media_parentId' },
  { table: 'activities', fields: ['childId'], name: 'idx_activities_childId' },
  { table: 'chat_messages', fields: ['senderId'], name: 'idx_chat_messages_senderId' },
  { table: 'teacher_responsibilities', fields: ['teacherId'], name: 'idx_teacher_responsibilities_teacherId' },
  { table: 'teacher_tasks', fields: ['teacherId'], name: 'idx_teacher_tasks_teacherId' },
  { table: 'teacher_work_history', fields: ['teacherId'], name: 'idx_teacher_work_history_teacherId' },
];

export async function up(queryInterface) {
  for (const { table, name } of OLD_INDEXES) {
    try {
      await queryInterface.removeIndex(table, name);
    } catch {
      // Index didn't exist (prior migration silently failed) — continue
    }
  }

  for (const { table, fields, name } of NEW_INDEXES) {
    try {
      await queryInterface.addIndex(table, fields, { name });
    } catch (err) {
      if (err.message && err.message.includes('already exists')) {
        // Already indexed (model-level index or prior run) — skip
      } else {
        throw err;
      }
    }
  }
}

export async function down(queryInterface) {
  for (const { table, name } of NEW_INDEXES) {
    try {
      await queryInterface.removeIndex(table, name);
    } catch {
      // Ignore
    }
  }
  // Re-create the old (incorrect) indexes so down() is idempotent
  for (const { table, name } of OLD_INDEXES) {
    try {
      const field = name.split('idx_' + table.replace(/-/g, '_') + '_')[1];
      if (field) await queryInterface.addIndex(table, [field], { name });
    } catch {
      // Ignore
    }
  }
}
