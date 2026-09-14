'use strict';

/**
 * WP2 — reset the reception verification documents that were approved against
 * files that never existed.
 *
 * All 12 rows in `documents` carry a filePath of the form
 * /uploads/documents/<uuid>.pdf. No backend code produces that path —
 * config/storage.js writes to /uploads/media/ — and every one of them 404s in
 * production. The blobs never existed in a deployed container, so no reviewer
 * could have opened them. Six are nonetheless marked `approved`.
 *
 * Owner decision (2026-09-15): reset to `pending` and require re-upload before
 * launch, because no document was ever verifiable and therefore no approval was
 * ever valid.
 *
 * Evidence preservation: the point of this migration is a finding, so erasing
 * the prior state would destroy it. Each reset writes an `audit_log` row
 * (action='document_reset_unverifiable') carrying the original status, the
 * document type, the file path that never resolved, and the owning user. The
 * audit_log table is append-only at three layers (CLAUDE.md), so the record
 * outlives any later edit to `documents`.
 *
 * NOT touched: users.documentsApproved. Reception login requires
 * documentsApproved && isActive (middleware/auth.js:108), so flipping it would
 * lock 12 live reception accounts out of the platform. That is a separate
 * decision for the owner; this migration deliberately leaves the flag alone and
 * the accounts logged in.
 *
 * Interaction with the activation recomputation
 * (adminReceptionController.js:250-263, `allDocuments.every(approved) &&
 * length > 0`): this migration never calls that path. Moving a row approved ->
 * pending can only make `every(approved)` FALSE, never true, so it cannot
 * activate an account as a side effect. When an admin later approves a genuine
 * re-upload, the recomputation runs normally over the then-current rows.
 *
 * Idempotent: only rows still `approved`/`rejected` with the phantom path are
 * touched, so a re-run is a no-op.
 */

const PHANTOM_PATH_PREFIX = '/uploads/documents/';

/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface) {
    const [rows] = await queryInterface.sequelize.query(
      `SELECT d.id, d."userId", d."documentType", d.status, d."filePath", d."fileName", u."schoolId"
         FROM documents d
         JOIN users u ON u.id = d."userId"
        WHERE d.status <> 'pending'
          AND d."filePath" LIKE :prefix`,
      { replacements: { prefix: `${PHANTOM_PATH_PREFIX}%` } },
    );

    if (rows.length === 0) {
      // Not this database, or already applied.
      return;
    }

    await queryInterface.sequelize.transaction(async (transaction) => {
      for (const r of rows) {
        // Record the finding BEFORE mutating, so the original status survives.
        await queryInterface.sequelize.query(
          `INSERT INTO audit_log ("actorRole", action, entity, "entityId", "schoolId", meta, "occurredAt")
           VALUES ('system', 'document_reset_unverifiable', 'Document', :id, :schoolId, :meta::jsonb, NOW())`,
          {
            replacements: {
              id: r.id,
              schoolId: r.schoolId ?? null,
              meta: JSON.stringify({
                reason:
                  'Approved against a file that never existed: filePath is under /uploads/documents/, a path no backend code writes, and the object 404s in production.',
                previousStatus: r.status,
                newStatus: 'pending',
                documentType: r.documentType,
                fileName: r.fileName,
                filePath: r.filePath,
                userId: r.userId,
                migration: '20260915000002-reset-unverifiable-reception-documents',
                ownerDecision: 'reset to pending, require re-upload before launch',
                note: 'users.documentsApproved intentionally NOT modified — see migration header.',
              }),
            },
            transaction,
          },
        );

        await queryInterface.sequelize.query(
          `UPDATE documents
              SET status = 'pending', "updatedAt" = NOW()
            WHERE id = :id`,
          { replacements: { id: r.id }, transaction },
        );
      }
    });
  },

  async down(queryInterface) {
    // Restore each document to the status recorded in its audit row. The audit
    // rows themselves are append-only and are NOT removed — the finding stands
    // regardless of the document state.
    await queryInterface.sequelize.query(
      `UPDATE documents d
          SET status = a.meta->>'previousStatus', "updatedAt" = NOW()
         FROM (
           SELECT DISTINCT ON ("entityId") "entityId", meta
             FROM audit_log
            WHERE action = 'document_reset_unverifiable'
            ORDER BY "entityId", "occurredAt" DESC
         ) a
        WHERE d.id = a."entityId"
          AND d.status = 'pending'`,
    );
  },
};
