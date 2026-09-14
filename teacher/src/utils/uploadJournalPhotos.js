/**
 * Journal photo delivery.
 *
 * The parent-journal composer lets a teacher attach photos, but until now
 * `handleJournalSend` destructured only { subject, body, recipientIds } and the
 * `photos` array was silently dropped — while the UI told the teacher
 * "Photos are only visible to selected parents". Photos never left the browser.
 *
 * Delivery model (per product decision): reuse the proven POST /media/upload
 * path, one Media row per (child, photo). Photos then show up in the parent's
 * existing Media gallery, inherit its school/assignment authorisation, and
 * require no new model, migration, or retrieval path.
 *
 * A journal send fans out to up to 50 children × 3 photos, so uploads run with
 * bounded concurrency rather than all at once.
 */

/** Max simultaneous uploads. Keeps a 150-request fan-out from stampeding the API. */
const CONCURRENCY = 4;

/**
 * Run tasks with a bounded number in flight. Never rejects: each task's outcome
 * is captured so one failed photo cannot abort the rest of the delivery.
 * @param {Array<() => Promise<any>>} tasks
 * @param {number} limit
 * @returns {Promise<Array<{ok: boolean, value?: any, error?: Error}>>}
 */
async function runPooled(tasks, limit = CONCURRENCY) {
  const results = new Array(tasks.length);
  let next = 0;

  const worker = async () => {
    while (next < tasks.length) {
      const i = next++;
      try {
        results[i] = { ok: true, value: await tasks[i]() };
      } catch (error) {
        results[i] = { ok: false, error };
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

/**
 * Upload each photo for each child.
 *
 * @param {object}   opts
 * @param {object}   opts.api       - the shared axios instance
 * @param {File[]}   opts.photos    - files from the composer
 * @param {string[]} opts.childIds  - children whose journal entry actually persisted
 * @param {string}   opts.subject   - journal subject, reused as the media title (required by the API)
 * @param {string}   opts.date      - YYYY-MM-DD
 * @returns {Promise<{attempted: number, uploaded: number, failed: number}>}
 */
export async function uploadJournalPhotos({ api, photos, childIds, subject, date }) {
  const files = Array.isArray(photos) ? photos.filter(Boolean) : [];
  const ids = Array.isArray(childIds) ? childIds.filter(Boolean) : [];

  if (files.length === 0 || ids.length === 0) {
    return { attempted: 0, uploaded: 0, failed: 0 };
  }

  // The media API requires a non-empty title of at most 500 chars.
  const rawTitle = (subject || '').trim() || 'Kundalik surati';
  const title = rawTitle.slice(0, 500);

  const tasks = [];
  for (const childId of ids) {
    for (const file of files) {
      tasks.push(async () => {
        const payload = new FormData();
        payload.append('childId', childId);
        payload.append('title', title);
        if (date) payload.append('date', date);
        payload.append('file', file);
        // shared/services/api.js strips the JSON Content-Type for FormData.
        return api.post('/media/upload', payload);
      });
    }
  }

  const results = await runPooled(tasks);
  const uploaded = results.filter((r) => r && r.ok).length;

  return { attempted: tasks.length, uploaded, failed: tasks.length - uploaded };
}

export default uploadJournalPhotos;
