/**
 * CSV export, shared.
 *
 * D-42: the admin portal had no data export on any route. Reception can export
 * its parents and government can export its schools, but a school director —
 * the person who most often has to hand a list to someone outside the system —
 * could export nothing at all.
 *
 * Written as a shared helper rather than a third copy of the same fifteen lines,
 * because the two existing copies had already drifted: the government export
 * shipped an English header into an Uzbek UI (D-45) while reception's was
 * translated.
 *
 * The BOM is not decoration. Without it Excel on a Windows machine set to a
 * Cyrillic or Latin-Uzbek locale renders "Ism" as mojibake, which is the only
 * way most of these files will ever be opened.
 */

/** ISO date in local time, for filenames. */
const today = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/**
 * @param {string[]} headers   already translated
 * @param {Array<Array<*>>} rows
 * @param {string} baseName    filename without date or extension
 */
export function exportCsv(headers, rows, baseName) {
  const quote = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map((r) => r.map(quote).join(',')).join('\n');

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${baseName}-${today()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  return { rows: rows.length, fileName: a.download };
}
