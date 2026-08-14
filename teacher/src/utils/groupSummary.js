/**
 * D-29 — a teacher who owns more than one group was shown ONE group's name over
 * ALL of their children.
 *
 * Both the dashboard and the attendance header read `children[0]?.groupName` and
 * printed it above the full roll, so `tarbiyachi1@tmm3.uz` — who owns Umid
 * guruhi (12 children) and Yulduz guruhi (9) — saw:
 *
 *     "Umid guruhi" Guruh · 21 bola
 *
 * Umid has 12. Yulduz was never named on either screen. The count of 21 was
 * always right; only the label was wrong, and there was no per-group split.
 *
 * Returns the label to print for a set of children:
 *   0 groups            -> null (caller falls back to its generic label)
 *   1 group             -> that group's name (unchanged behaviour)
 *   2-3 groups          -> the names, comma-joined, so both are visible
 *   4+ groups           -> "<n> guruh", because a header is not a list
 */
export function groupSummary(children, t) {
  const names = [...new Set(
    (children || [])
      .map((c) => (c?.groupName || '').trim())
      .filter(Boolean)
  )];

  if (names.length === 0) return null;
  if (names.length <= 3) return names.join(', ');
  return t('dashboard.groupCount', {
    count: names.length,
    defaultValue: `${names.length} guruh`,
  });
}

/** How many distinct groups this set of children spans. */
export function groupCount(children) {
  return new Set(
    (children || []).map((c) => (c?.groupName || '').trim()).filter(Boolean)
  ).size;
}
