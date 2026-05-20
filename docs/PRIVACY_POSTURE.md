# Uchqun Platform — Privacy Posture

## Group-wide media visibility (PL-001 / C-02)

**Decision date:** 2026-05-20
**Decision:** Option 1 — Accept current design.
**Decided by:** Platform owner (Max). Partner consultation deferred.

### Behavior

Parents whose children are in the same group can see media uploaded for any child
in that group. A photo a teacher uploads of one child's playtime is visible to
all parents in that group, not only that child's parent.

### Rationale

This design reflects how group childcare and special-education classrooms operate:
shared activities, group photos, peer interaction. Restricting media visibility
to single-child-only would lose the social context that makes the platform useful
for parents seeing how their child interacts with peers.

### Required disclosure

Before this design ships to real-user production, the following must be in place:
1. A clear notice during parent registration / onboarding explaining group-wide
   media visibility.
2. The platform's privacy policy must explicitly state this behavior.
3. Parents must affirmatively consent (checkbox) before activation of their
   account.

### Status

- Backend behavior: implemented (existing design).
- Frontend onboarding notice: NOT IMPLEMENTED. Tracked as cross-portal item for
  whichever portal serves parent registration (likely Reception or a future
  Parent portal).
- Privacy policy text: NOT WRITTEN. Tracked as content task.

### Partner sign-off

This decision was made by the platform owner without formal partner sign-off.
Before real-user launch, the partner must confirm acceptance of this design.
If the partner objects, the design changes are tracked as a follow-up sprint.

---

## Localization disclosure (PL-009)

The platform's Russian and Uzbek translations are AI-generated and have not been
reviewed by a native speaker. Users may encounter awkward or incorrect translations.
This is a known limitation pending professional translation review before real-user
launch.

Translation files are located at `backend/i18n/ru.json`, `backend/i18n/uz-latn.json`,
and `backend/i18n/uz-cyrl.json`. Each file contains a `_metadata` block that
identifies the translations as AI-generated and unverified. See `backend/i18n/README.md`
for the full disclosure.

The platform UI should display a notice during initial parent registration that the
platform's localization is currently auto-translated and may contain errors. This UI
notice is tracked as cross-portal item CP-019.
