import { parse } from 'csv-parse/sync';
import ImportJob from '../../models/ImportJob.js';
import User from '../../models/User.js';
import Child from '../../models/Child.js';
import { logAudit } from '../../utils/auditLogger.js';
import logger from '../../utils/logger.js';

const REQUIRED_HEADERS = [
  'firstName', 'lastName', 'dateOfBirth', 'gender',
  'disabilityType', 'class', 'teacher', 'parentEmail',
];
const VALID_GENDERS = ['Male', 'Female', 'Other'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validateRow(row, parentMap, seenKeys, rowNum) {
  const errors = [];

  if (!row.firstName?.trim()) {
    errors.push({ row: rowNum, field: 'firstName', code: 'IMPORT_ROW_FIRST_NAME_REQUIRED' });
  }
  if (!row.lastName?.trim()) {
    errors.push({ row: rowNum, field: 'lastName', code: 'IMPORT_ROW_LAST_NAME_REQUIRED' });
  }

  const dobStr = row.dateOfBirth?.trim() ?? '';
  if (!dobStr || !DATE_RE.test(dobStr) || isNaN(new Date(dobStr).getTime())) {
    errors.push({ row: rowNum, field: 'dateOfBirth', code: 'IMPORT_ROW_DOB_INVALID' });
  } else if (new Date(dobStr) > new Date()) {
    errors.push({ row: rowNum, field: 'dateOfBirth', code: 'IMPORT_ROW_DOB_IN_FUTURE' });
  }

  if (!VALID_GENDERS.includes(row.gender?.trim())) {
    errors.push({ row: rowNum, field: 'gender', code: 'IMPORT_ROW_GENDER_INVALID' });
  }
  if (!row.disabilityType?.trim()) {
    errors.push({ row: rowNum, field: 'disabilityType', code: 'IMPORT_ROW_DISABILITY_TYPE_REQUIRED' });
  }
  if (!row.class?.trim()) {
    errors.push({ row: rowNum, field: 'class', code: 'IMPORT_ROW_CLASS_REQUIRED' });
  }
  if (!row.teacher?.trim()) {
    errors.push({ row: rowNum, field: 'teacher', code: 'IMPORT_ROW_TEACHER_REQUIRED' });
  }

  const parentEmail = row.parentEmail?.trim().toLowerCase() ?? '';
  if (!parentEmail || !EMAIL_RE.test(parentEmail)) {
    errors.push({ row: rowNum, field: 'parentEmail', code: 'IMPORT_ROW_PARENT_EMAIL_INVALID' });
  } else if (!parentMap[parentEmail]) {
    errors.push({ row: rowNum, field: 'parentEmail', code: 'IMPORT_ROW_PARENT_NOT_FOUND' });
  }

  // Within-file duplicate detection (key: firstName|lastName|dateOfBirth, case-insensitive)
  const firstName = row.firstName?.trim().toLowerCase() ?? '';
  const lastName = row.lastName?.trim().toLowerCase() ?? '';
  const dob = row.dateOfBirth?.trim() ?? '';
  if (firstName && lastName && dob) {
    const key = `${firstName}|${lastName}|${dob}`;
    if (seenKeys.has(key)) {
      errors.push({ row: rowNum, field: null, code: 'IMPORT_ROW_DUPLICATE' });
    } else {
      seenKeys.add(key);
    }
  }

  return errors;
}

export const validate = async (req, res) => {
  try {
    if (!req.file || req._importFileRejected) {
      if (req._importFileRejected) {
        return res.status(400).json({ success: false, error: { code: 'IMPORT_FILE_INVALID_TYPE' } });
      }
      return res.status(400).json({ success: false, error: { code: 'IMPORT_FILE_REQUIRED' } });
    }

    if (!req.file.originalname.toLowerCase().endsWith('.csv')) {
      return res.status(400).json({ success: false, error: { code: 'IMPORT_FILE_INVALID_TYPE' } });
    }

    if (req.file.buffer.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'IMPORT_FILE_EMPTY' } });
    }

    let records;
    try {
      records = parse(req.file.buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      });
    } catch (parseErr) {
      logger.error('CSV parse failed', { error: parseErr.message });
      return res.status(400).json({ success: false, error: { code: 'IMPORT_PARSE_FAILED' } });
    }

    if (records.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'IMPORT_FILE_EMPTY' } });
    }

    const headers = Object.keys(records[0]);
    const missingHeaders = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
    if (missingHeaders.length > 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'IMPORT_MISSING_HEADERS', detail: `Missing: ${missingHeaders.join(', ')}` },
      });
    }

    // Batch parent lookup — one DB query for all unique emails
    const uniqueEmails = [
      ...new Set(
        records
          .map((r) => r.parentEmail?.trim().toLowerCase())
          .filter((e) => e && EMAIL_RE.test(e))
      ),
    ];
    const foundParents = uniqueEmails.length
      ? await User.findAll({
          where: { email: uniqueEmails, role: 'parent' },
          attributes: ['id', 'email'],
        })
      : [];
    const parentMap = Object.fromEntries(foundParents.map((p) => [p.email, p.id]));

    const seenKeys = new Set();
    const errors = [];
    let validRows = 0;
    let invalidRows = 0;

    for (let i = 0; i < records.length; i++) {
      const rowErrors = validateRow(records[i], parentMap, seenKeys, i + 2);
      if (rowErrors.length > 0) {
        invalidRows++;
        errors.push(...rowErrors);
      } else {
        validRows++;
      }
    }

    const importJob = await ImportJob.create({
      schoolId: req.user.schoolId,
      createdBy: req.user.id,
      filename: req.file.originalname,
      status: 'ready',
      totalRows: records.length,
      validRows,
      invalidRows,
      errors,
      rawCsv: req.file.buffer.toString('utf8'),
    });

    return res.status(201).json({
      success: true,
      data: {
        importJobId: importJob.id,
        filename: importJob.filename,
        totalRows: importJob.totalRows,
        validRows: importJob.validRows,
        invalidRows: importJob.invalidRows,
        errors: importJob.errors,
      },
    });
  } catch (error) {
    logger.error('Import validate error', { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, error: { code: 'IMPORT_CREATE_FAILED' } });
  }
};

// ─── T1-7b — processImport ────────────────────────────────────────────────────

// Exported for direct testing. Called via setImmediate from start().
export async function processImport(importJob, actor) {
  try {
    const records = parse(importJob.rawCsv, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });

    // Fresh parent lookup — state may have changed since T1-7a validation
    const uniqueEmails = [
      ...new Set(
        records
          .map((r) => r.parentEmail?.trim().toLowerCase())
          .filter((e) => e && EMAIL_RE.test(e))
      ),
    ];
    const foundParents = uniqueEmails.length
      ? await User.findAll({
          where: { email: uniqueEmails, role: 'parent' },
          attributes: ['id', 'email'],
        })
      : [];
    const parentMap = Object.fromEntries(foundParents.map((p) => [p.email, p.id]));

    // Skip rows that T1-7a already marked invalid (stored in importJob.errors by row number)
    const invalidRowNums = new Set(importJob.errors.map((e) => e.row));
    const newErrors = [];

    for (let i = 0; i < records.length; i++) {
      const rowNum = i + 2;
      if (invalidRowNums.has(rowNum)) continue;

      const row = records[i];
      const parentEmail = row.parentEmail?.trim().toLowerCase();
      const parentId = parentMap[parentEmail];

      // Parent may have been deleted between T1-7a and T1-7b
      if (!parentId) {
        newErrors.push({ row: rowNum, field: 'parentEmail', code: 'IMPORT_ROW_PARENT_NOT_FOUND' });
        continue;
      }

      try {
        const child = await Child.create({
          firstName: row.firstName.trim(),
          lastName: row.lastName.trim(),
          dateOfBirth: row.dateOfBirth.trim(),
          gender: row.gender.trim(),
          disabilityType: row.disabilityType.trim(),
          class: row.class.trim(),
          teacher: row.teacher.trim(),
          parentId,
          schoolId: importJob.schoolId,
          specialNeeds: row.specialNeeds?.trim() || null,
          medicalDiagnosis: row.medicalDiagnosis?.trim() || null,
          institutionStartDate: row.institutionStartDate?.trim() || null,
          fatherFullName: row.fatherFullName?.trim() || null,
          motherFullName: row.motherFullName?.trim() || null,
          address: row.address?.trim() || null,
          contactPhone: row.contactPhone?.trim() || null,
          emergencyContact: {},
        });

        await logAudit({
          actorId: actor.id,
          actorRole: actor.role,
          action: 'bulk_import',
          entity: 'children',
          entityId: child.id,
          schoolId: importJob.schoolId,
          meta: { importJobId: importJob.id, row: rowNum },
        });
      } catch (rowErr) {
        logger.error('Import row create failed', { row: rowNum, error: rowErr.message });
        newErrors.push({ row: rowNum, field: null, code: 'IMPORT_ROW_CREATE_FAILED' });
      }
    }

    await importJob.update({
      status: 'completed',
      errors: [...importJob.errors, ...newErrors],
    });
  } catch (fatalErr) {
    logger.error('processImport fatal error', { error: fatalErr.message, importJobId: importJob.id });
    try {
      await importJob.update({ status: 'failed' });
    } catch { /* swallow — cannot report failure if this update also fails */ }
  }
}

// ─── T1-7b — HTTP handlers ───────────────────────────────────────────────────

export const start = async (req, res) => {
  try {
    const importJob = await ImportJob.findOne({ where: { id: req.params.id } });
    if (!importJob) {
      return res.status(404).json({ success: false, error: { code: 'IMPORT_JOB_NOT_FOUND' } });
    }
    if (importJob.schoolId !== req.user.schoolId) {
      return res.status(403).json({ success: false, error: { code: 'IMPORT_JOB_FORBIDDEN' } });
    }
    if (importJob.status !== 'ready') {
      return res.status(409).json({ success: false, error: { code: 'IMPORT_JOB_NOT_READY' } });
    }
    if (importJob.validRows === 0) {
      return res.status(422).json({ success: false, error: { code: 'IMPORT_NO_VALID_ROWS' } });
    }

    await importJob.update({ status: 'importing' });

    res.status(202).json({ success: true, data: { importJobId: importJob.id, status: 'importing' } });

    setImmediate(() => processImport(importJob, req.user));
  } catch (error) {
    logger.error('Import start error', { error: error.message });
    return res.status(500).json({ success: false, error: { code: 'IMPORT_START_FAILED' } });
  }
};

export const getStatus = async (req, res) => {
  try {
    const importJob = await ImportJob.findOne({
      where: { id: req.params.id },
      attributes: ['id', 'schoolId', 'filename', 'status', 'totalRows', 'validRows', 'invalidRows', 'createdAt', 'updatedAt'],
    });
    if (!importJob) {
      return res.status(404).json({ success: false, error: { code: 'IMPORT_JOB_NOT_FOUND' } });
    }
    if (importJob.schoolId !== req.user.schoolId) {
      return res.status(403).json({ success: false, error: { code: 'IMPORT_JOB_FORBIDDEN' } });
    }
    return res.json({ success: true, data: importJob });
  } catch (error) {
    logger.error('Import status error', { error: error.message });
    return res.status(500).json({ success: false, error: { code: 'IMPORT_STATUS_FAILED' } });
  }
};

export const getErrors = async (req, res) => {
  try {
    const importJob = await ImportJob.findOne({
      where: { id: req.params.id },
      attributes: ['id', 'schoolId', 'errors'],
    });
    if (!importJob) {
      return res.status(404).json({ success: false, error: { code: 'IMPORT_JOB_NOT_FOUND' } });
    }
    if (importJob.schoolId !== req.user.schoolId) {
      return res.status(403).json({ success: false, error: { code: 'IMPORT_JOB_FORBIDDEN' } });
    }
    return res.json({ success: true, data: { importJobId: importJob.id, errors: importJob.errors } });
  } catch (error) {
    logger.error('Import errors error', { error: error.message });
    return res.status(500).json({ success: false, error: { code: 'IMPORT_ERRORS_FAILED' } });
  }
};
