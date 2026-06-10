// IRR-MONTHLY-MILESTONES (Option B) — controller for monthly milestones.
//
// Endpoints (mounted under /api/v1/teacher):
//   GET    /irr/:irrId/monthly-milestones                  list all for IRR
//   GET    /long-term-goals/:ltgId/monthly-milestones      list 12 for one LTG
//   POST   /long-term-goals/:ltgId/monthly-milestones      create/upsert one
//   PUT    /long-term-goals/:ltgId/monthly-milestones/bulk replace all 12 in one shot
//   PATCH  /monthly-milestones/:id                         update target/actual/status/notes
//   DELETE /monthly-milestones/:id                         remove a milestone
//
// Authorization: teacher must be assigned to the child whose LTG/IRR this is
// (school-scope + teacher-assignment via the existing resolveIRRAccess helper
// pattern). Admin/government read-only access lives in separate route blocks.

import IRR from '../../models/IRR.js';
import LongTermGoal from '../../models/LongTermGoal.js';
import MonthlyMilestone from '../../models/MonthlyMilestone.js';
import Child from '../../models/Child.js';
import { isTeacherAssignedToChild } from '../../utils/schoolValidation.js';
import logger from '../../utils/logger.js';

const VALID_STATUSES = ['planned', 'achieved', 'partial', 'missed'];
const MAX_TEXT_LEN = 2000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ── Access helpers ───────────────────────────────────────────────────────────

async function resolveIRRForRead(irrId, req) {
  if (!UUID_RE.test(irrId)) return null;
  const irr = await IRR.findByPk(irrId);
  if (!irr) return null;
  if (irr.schoolId !== req.user.schoolId) return null;
  if (irr.childId) {
    const child = await Child.findByPk(irr.childId);
    if (child && !(await isTeacherAssignedToChild(child, req))) return null;
  }
  return irr;
}

async function resolveLTGForWrite(ltgId, req) {
  if (!UUID_RE.test(ltgId)) return null;
  const ltg = await LongTermGoal.findByPk(ltgId);
  if (!ltg) return null;
  if (ltg.schoolId !== req.user.schoolId) return null;
  if (ltg.childId) {
    const child = await Child.findByPk(ltg.childId);
    if (child && !(await isTeacherAssignedToChild(child, req))) return null;
  }
  return ltg;
}

async function resolveMilestoneForWrite(id, req) {
  if (!UUID_RE.test(id)) return null;
  const milestone = await MonthlyMilestone.findByPk(id);
  if (!milestone) return null;
  if (milestone.schoolId !== req.user.schoolId) return null;
  if (milestone.childId) {
    const child = await Child.findByPk(milestone.childId);
    if (child && !(await isTeacherAssignedToChild(child, req))) return null;
  }
  return milestone;
}

// ── Validators ───────────────────────────────────────────────────────────────

function validateMonth(n) {
  return Number.isInteger(n) && n >= 1 && n <= 12;
}

function validateText(s, { allowEmpty = false } = {}) {
  if (s == null) return allowEmpty;
  if (typeof s !== 'string') return false;
  const trimmed = s.trim();
  if (!allowEmpty && trimmed.length === 0) return false;
  return trimmed.length <= MAX_TEXT_LEN;
}

// ── Handlers ─────────────────────────────────────────────────────────────────

export const listByIRR = async (req, res) => {
  try {
    const irr = await resolveIRRForRead(req.params.irrId, req);
    if (!irr) return res.status(404).json({ success: false, error: { code: 'MONTHLY_MILESTONE_IRR_NOT_ACCESSIBLE' } });
    const rows = await MonthlyMilestone.findAll({
      where: { irrId: irr.id },
      order: [['longTermGoalId', 'ASC'], ['monthNumber', 'ASC']],
    });
    return res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('listByIRR monthly-milestones failed', { error: err.message });
    return res.status(500).json({ success: false, error: { code: 'MONTHLY_MILESTONE_LIST_FAILED' } });
  }
};

export const listByLTG = async (req, res) => {
  try {
    const ltg = await resolveLTGForWrite(req.params.ltgId, req);
    if (!ltg) return res.status(404).json({ success: false, error: { code: 'MONTHLY_MILESTONE_LTG_NOT_ACCESSIBLE' } });
    const rows = await MonthlyMilestone.findAll({
      where: { longTermGoalId: ltg.id },
      order: [['monthNumber', 'ASC']],
    });
    return res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('listByLTG monthly-milestones failed', { error: err.message });
    return res.status(500).json({ success: false, error: { code: 'MONTHLY_MILESTONE_LIST_FAILED' } });
  }
};

export const create = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, error: { code: 'MONTHLY_MILESTONE_FORBIDDEN' } });
    }
    const ltg = await resolveLTGForWrite(req.params.ltgId, req);
    if (!ltg) return res.status(404).json({ success: false, error: { code: 'MONTHLY_MILESTONE_LTG_NOT_ACCESSIBLE' } });

    const { monthNumber, targetText, status, actualText, assessedAt, notes } = req.body;

    if (!validateMonth(monthNumber)) {
      return res.status(400).json({ success: false, error: { code: 'MONTHLY_MILESTONE_INVALID_MONTH' } });
    }
    if (!validateText(targetText)) {
      return res.status(400).json({ success: false, error: { code: 'MONTHLY_MILESTONE_TARGET_REQUIRED' } });
    }
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, error: { code: 'MONTHLY_MILESTONE_INVALID_STATUS' } });
    }
    if (actualText != null && !validateText(actualText, { allowEmpty: true })) {
      return res.status(400).json({ success: false, error: { code: 'MONTHLY_MILESTONE_TEXT_TOO_LONG' } });
    }
    if (notes != null && !validateText(notes, { allowEmpty: true })) {
      return res.status(400).json({ success: false, error: { code: 'MONTHLY_MILESTONE_TEXT_TOO_LONG' } });
    }

    // Upsert behaviour: if (longTermGoalId, monthNumber) already exists, update target.
    const existing = await MonthlyMilestone.findOne({
      where: { longTermGoalId: ltg.id, monthNumber },
    });
    if (existing) {
      await existing.update({
        targetText: targetText.trim(),
        status: status ?? existing.status,
        actualText: actualText !== undefined ? (actualText ? actualText.trim() : null) : existing.actualText,
        assessedAt: assessedAt ?? existing.assessedAt,
        assessedBy: status && status !== 'planned' ? req.user.id : existing.assessedBy,
        notes: notes !== undefined ? (notes ? notes.trim() : null) : existing.notes,
      });
      return res.json({ success: true, data: existing });
    }

    const row = await MonthlyMilestone.create({
      irrId: ltg.irrId,
      longTermGoalId: ltg.id,
      childId: ltg.childId,
      schoolId: ltg.schoolId,
      monthNumber,
      targetText: targetText.trim(),
      status: status ?? 'planned',
      actualText: actualText ? actualText.trim() : null,
      assessedAt: assessedAt ?? null,
      assessedBy: status && status !== 'planned' ? req.user.id : null,
      notes: notes ? notes.trim() : null,
    });
    return res.status(201).json({ success: true, data: row });
  } catch (err) {
    logger.error('create monthly-milestone failed', { error: err.message });
    return res.status(500).json({ success: false, error: { code: 'MONTHLY_MILESTONE_CREATE_FAILED' } });
  }
};

export const replaceAll = async (req, res) => {
  // Bulk endpoint: accepts { milestones: [{ monthNumber, targetText, status?, ... }, ...] }
  // Replaces all 1-12 milestones for the LTG in one transaction (planned-only
  // values for months not present in the payload are deleted).
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, error: { code: 'MONTHLY_MILESTONE_FORBIDDEN' } });
    }
    const ltg = await resolveLTGForWrite(req.params.ltgId, req);
    if (!ltg) return res.status(404).json({ success: false, error: { code: 'MONTHLY_MILESTONE_LTG_NOT_ACCESSIBLE' } });

    const { milestones } = req.body;
    if (!Array.isArray(milestones)) {
      return res.status(400).json({ success: false, error: { code: 'MONTHLY_MILESTONE_INVALID_PAYLOAD' } });
    }

    // Validate every row before touching the DB.
    const months = new Set();
    for (const m of milestones) {
      if (!validateMonth(m.monthNumber)) {
        return res.status(400).json({ success: false, error: { code: 'MONTHLY_MILESTONE_INVALID_MONTH' } });
      }
      if (months.has(m.monthNumber)) {
        return res.status(400).json({ success: false, error: { code: 'MONTHLY_MILESTONE_DUPLICATE_MONTH' } });
      }
      months.add(m.monthNumber);
      if (!validateText(m.targetText)) {
        return res.status(400).json({ success: false, error: { code: 'MONTHLY_MILESTONE_TARGET_REQUIRED' } });
      }
      if (m.status && !VALID_STATUSES.includes(m.status)) {
        return res.status(400).json({ success: false, error: { code: 'MONTHLY_MILESTONE_INVALID_STATUS' } });
      }
      if (m.actualText != null && !validateText(m.actualText, { allowEmpty: true })) {
        return res.status(400).json({ success: false, error: { code: 'MONTHLY_MILESTONE_TEXT_TOO_LONG' } });
      }
      if (m.notes != null && !validateText(m.notes, { allowEmpty: true })) {
        return res.status(400).json({ success: false, error: { code: 'MONTHLY_MILESTONE_TEXT_TOO_LONG' } });
      }
    }

    // Fetch existing, decide which to update / create / delete.
    const existing = await MonthlyMilestone.findAll({ where: { longTermGoalId: ltg.id } });
    const existingByMonth = new Map(existing.map(e => [e.monthNumber, e]));

    const results = [];
    for (const m of milestones) {
      const prior = existingByMonth.get(m.monthNumber);
      if (prior) {
        await prior.update({
          targetText: m.targetText.trim(),
          status: m.status ?? prior.status,
          actualText: m.actualText !== undefined ? (m.actualText ? m.actualText.trim() : null) : prior.actualText,
          assessedAt: m.assessedAt ?? prior.assessedAt,
          assessedBy: m.status && m.status !== 'planned' ? req.user.id : prior.assessedBy,
          notes: m.notes !== undefined ? (m.notes ? m.notes.trim() : null) : prior.notes,
        });
        results.push(prior);
        existingByMonth.delete(m.monthNumber);
      } else {
        const row = await MonthlyMilestone.create({
          irrId: ltg.irrId,
          longTermGoalId: ltg.id,
          childId: ltg.childId,
          schoolId: ltg.schoolId,
          monthNumber: m.monthNumber,
          targetText: m.targetText.trim(),
          status: m.status ?? 'planned',
          actualText: m.actualText ? m.actualText.trim() : null,
          assessedAt: m.assessedAt ?? null,
          assessedBy: m.status && m.status !== 'planned' ? req.user.id : null,
          notes: m.notes ? m.notes.trim() : null,
        });
        results.push(row);
      }
    }

    // Delete months not present in the payload, but only if status was 'planned'
    // — preserve evaluated milestones even if the teacher omits them in a re-save.
    for (const orphan of existingByMonth.values()) {
      if (orphan.status === 'planned') {
        await orphan.destroy({ actorId: req.user.id, actorRole: req.user.role, reason: 'bulk_replace' });
      }
    }

    results.sort((a, b) => a.monthNumber - b.monthNumber);
    return res.json({ success: true, data: results });
  } catch (err) {
    logger.error('replaceAll monthly-milestones failed', { error: err.message });
    return res.status(500).json({ success: false, error: { code: 'MONTHLY_MILESTONE_BULK_FAILED' } });
  }
};

export const update = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, error: { code: 'MONTHLY_MILESTONE_FORBIDDEN' } });
    }
    const milestone = await resolveMilestoneForWrite(req.params.id, req);
    if (!milestone) return res.status(404).json({ success: false, error: { code: 'MONTHLY_MILESTONE_NOT_ACCESSIBLE' } });

    const { targetText, status, actualText, assessedAt, notes } = req.body;
    const patch = {};

    if (targetText !== undefined) {
      if (!validateText(targetText)) {
        return res.status(400).json({ success: false, error: { code: 'MONTHLY_MILESTONE_TARGET_REQUIRED' } });
      }
      patch.targetText = targetText.trim();
    }
    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ success: false, error: { code: 'MONTHLY_MILESTONE_INVALID_STATUS' } });
      }
      patch.status = status;
      patch.assessedBy = status !== 'planned' ? req.user.id : null;
    }
    if (actualText !== undefined) {
      if (actualText && !validateText(actualText, { allowEmpty: true })) {
        return res.status(400).json({ success: false, error: { code: 'MONTHLY_MILESTONE_TEXT_TOO_LONG' } });
      }
      patch.actualText = actualText ? actualText.trim() : null;
    }
    if (assessedAt !== undefined) patch.assessedAt = assessedAt || null;
    if (notes !== undefined) {
      if (notes && !validateText(notes, { allowEmpty: true })) {
        return res.status(400).json({ success: false, error: { code: 'MONTHLY_MILESTONE_TEXT_TOO_LONG' } });
      }
      patch.notes = notes ? notes.trim() : null;
    }

    await milestone.update(patch);
    return res.json({ success: true, data: milestone });
  } catch (err) {
    logger.error('update monthly-milestone failed', { error: err.message });
    return res.status(500).json({ success: false, error: { code: 'MONTHLY_MILESTONE_UPDATE_FAILED' } });
  }
};

export const remove = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, error: { code: 'MONTHLY_MILESTONE_FORBIDDEN' } });
    }
    const milestone = await resolveMilestoneForWrite(req.params.id, req);
    if (!milestone) return res.status(404).json({ success: false, error: { code: 'MONTHLY_MILESTONE_NOT_ACCESSIBLE' } });
    await milestone.destroy({ actorId: req.user.id, actorRole: req.user.role });
    return res.json({ success: true });
  } catch (err) {
    logger.error('remove monthly-milestone failed', { error: err.message });
    return res.status(500).json({ success: false, error: { code: 'MONTHLY_MILESTONE_DELETE_FAILED' } });
  }
};
