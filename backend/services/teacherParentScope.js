import { Op } from 'sequelize';
import Child from '../models/Child.js';
import Group from '../models/Group.js';
import User from '../models/User.js';

/**
 * Returns the IDs of all groups owned by this teacher.
 * Canonical path: Group.teacherId → group.id
 */
export async function getTeacherGroupIds(teacherId) {
  const groups = await Group.findAll({
    where: { teacherId },
    attributes: ['id'],
    raw: true,
  });
  return groups.map((g) => g.id);
}

/**
 * Returns the distinct parentId values reachable by this teacher via the
 * canonical chain: Teacher → Group.teacherId → Child.groupId → Child.parentId
 *
 * Does NOT consult users.groupId / users.teacherId (denormalized).
 */
export async function getTeacherParentIds(teacherId) {
  const groupIds = await getTeacherGroupIds(teacherId);
  if (groupIds.length === 0) return [];

  const childRows = await Child.findAll({
    where: { groupId: { [Op.in]: groupIds } },
    attributes: ['parentId'],
    group: ['parentId'],
    raw: true,
  });
  return childRows.map((r) => r.parentId);
}

/**
 * Full parent list for a teacher with optional search + pagination.
 * Returns { rows: User[], count: number } — same shape as findAndCountAll.
 *
 * Canonical path only. Denormalized users.groupId / users.teacherId are NOT
 * used for scoping — they may be stale and must not be authoritative.
 */
export async function listTeacherParents(teacherId, { search, limit = 100, offset = 0 } = {}) {
  const groupIds = await getTeacherGroupIds(teacherId);
  if (groupIds.length === 0) return { rows: [], count: 0 };

  const childRows = await Child.findAll({
    where: { groupId: { [Op.in]: groupIds } },
    attributes: ['parentId'],
    group: ['parentId'],
    raw: true,
  });
  const parentIds = childRows.map((r) => r.parentId);
  if (parentIds.length === 0) return { rows: [], count: 0 };

  const where = { id: { [Op.in]: parentIds }, role: 'parent' };
  if (search) {
    where[Op.or] = [
      { firstName: { [Op.iLike]: `%${search}%` } },
      { lastName:  { [Op.iLike]: `%${search}%` } },
      { email:     { [Op.iLike]: `%${search}%` } },
      { phone:     { [Op.iLike]: `%${search}%` } },
    ];
  }

  const { rows, count } = await User.findAndCountAll({
    where,
    attributes: { exclude: ['password'] },
    include: [
      {
        model: Child,
        as: 'children',
        where: { groupId: { [Op.in]: groupIds } },
        required: false,
        attributes: ['id', 'firstName', 'lastName', 'dateOfBirth', 'gender', 'disabilityType', 'class', 'teacher'],
      },
      {
        model: Group,
        as: 'group',
        attributes: ['id', 'name'],
        required: false,
      },
    ],
    order: [['createdAt', 'DESC']],
    limit: parseInt(limit),
    offset: parseInt(offset),
    distinct: true,
  });
  return { rows, count };
}
