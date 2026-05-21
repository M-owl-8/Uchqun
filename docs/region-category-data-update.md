# Region & Category Real-Data Swap Instructions

**When:** Partner delivers the authoritative Uzbek region list and school category definitions (PL-015).  
**Effort:** 30–60 minutes. One migration file, no code changes.  
**Risk:** Low — codes/IDs are stable identifiers; only display names change.

---

## What Is Placeholder Right Now

| Table | Column(s) | Placeholder value | What changes |
|-------|-----------|-------------------|--------------|
| `regions` | `name` | "Region 01" … "Region 13" | Real Uzbek region names |
| `regions` | `code` | r01 … r13 | Real slugs (e.g. `toshkent`, `andijon`) — **if you change codes, update any hard-coded references** |
| `school_categories` | `name` | Kunduzgi parvarish, Yangi kun, Madad, Uyda qarab turish | Confirmed names from partner |
| `school_categories` | `code` | kunduzgi_parvarish, yangi_kun, madad, uyda_qarab_turish | Change **only** if partner redefines the concept; stable otherwise |

---

## What NEVER Changes (Scoping Depends On It)

- **Region UUIDs**: `00000000-0000-0000-0000-000000000001` through `00000000-0000-0000-0000-00000000000d` are the stable primary keys. Region accounts have `govRegionId` pointing to these UUIDs. Schools have `regionId` pointing to these UUIDs. **Do not regenerate or delete region rows** — only update `name` (and optionally `code`).

- **Category UUIDs**: `00000000-0000-0000-cafe-000000000001` through `00000000-0000-0000-cafe-000000000004`. Schools will have `categoryId` pointing to these. **Do not regenerate or delete category rows** — only update `name`.

- **All foreign keys key off UUID, never off name or code.** Renaming breaks nothing.

---

## Step-by-step: Regions

### 1. Create a new migration file

```
backend/migrations/20260600000000-update-real-region-names.js
```

### 2. Write the migration

```js
export const up = async (queryInterface) => {
  const now = new Date().toISOString();

  // Replace placeholder names with real Uzbek region names.
  // UUID stays constant — only name (and optionally code) changes.
  const updates = [
    { id: '00000000-0000-0000-0000-000000000001', code: 'toshkent_shahri', name: 'Toshkent shahri' },
    { id: '00000000-0000-0000-0000-000000000002', code: 'toshkent',        name: 'Toshkent viloyati' },
    // ... all 13 regions; get the list from PL-015 partner data
    { id: '00000000-0000-0000-0000-00000000000d', code: 'qoraqalpogiston', name: 'Qoraqalpogʻiston' },
  ];

  for (const r of updates) {
    await queryInterface.sequelize.query(
      `UPDATE regions SET code = :code, name = :name, "updatedAt" = :now WHERE id = :id`,
      { replacements: { ...r, now } }
    );
  }
};

export const down = async (queryInterface) => {
  // Revert to placeholder names if needed
  const now = new Date().toISOString();
  const placeholders = Array.from({ length: 13 }, (_, i) => {
    const n = i + 1;
    return { id: `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`, code: `r${String(n).padStart(2,'0')}`, name: `Region ${String(n).padStart(2,'0')}` };
  });
  for (const r of placeholders) {
    await queryInterface.sequelize.query(
      `UPDATE regions SET code = :code, name = :name, "updatedAt" = :now WHERE id = :id`,
      { replacements: { ...r, now } }
    );
  }
};
```

### 3. Run the migration

```bash
cd backend && npm run migrate
```

### 4. Verify

```sql
-- Run via postgres-uchqun MCP or psql:
SELECT id, code, name, "isRepublic" FROM regions ORDER BY name;
-- Expect 13 rows with real names; Karakalpakstan has isRepublic=true
```

---

## Step-by-step: School Categories

### 1. Confirm the final 4–5 categories with the partner

The current placeholders are:
1. `kunduzgi_parvarish` — "Kunduzgi parvarish" (Day attendance)
2. `yangi_kun` — "Yangi kun" (New day)
3. `madad` — "Madad" (Support)
4. `uyda_qarab_turish` — "Uyda qarab turish" (Home care)

If the partner confirms new names (or adds a 5th category):

### 2. For name changes only (same 4 categories)

Add to the same migration file above:

```js
// In up():
const categoryUpdates = [
  { id: '00000000-0000-0000-cafe-000000000001', name: 'Real Name 1' },
  { id: '00000000-0000-0000-cafe-000000000002', name: 'Real Name 2' },
  { id: '00000000-0000-0000-cafe-000000000003', name: 'Real Name 3' },
  { id: '00000000-0000-0000-cafe-000000000004', name: 'Real Name 4' },
];
for (const c of categoryUpdates) {
  await queryInterface.sequelize.query(
    `UPDATE school_categories SET name = :name, "updatedAt" = :now WHERE id = :id`,
    { replacements: { ...c, now } }
  );
}
```

### 3. If a 5th category is added

Append a new INSERT at the end of `up()`:

```js
await queryInterface.bulkInsert('school_categories', [{
  id: '00000000-0000-0000-cafe-000000000005',
  code: 'new_category_code',
  name: 'Real Category Name',
  isActive: true,
  createdAt: now,
  updatedAt: now,
}]);
```

### 4. Verify

```sql
SELECT id, code, name, "isActive" FROM school_categories ORDER BY code;
```

---

## Safety: Confirming Scoping Is Name-Independent

Run the existing test suite after the data swap:

```bash
cd backend && npm test -- --forceExit
```

All 102+ suites should pass with zero changes. The scoping tests use UUID constants
(`REGION_A = '00000000-...'`) — they are completely insensitive to name changes.

To manually confirm: search for `regionId` in test fixtures — you will find UUIDs, never
region name strings. That is the invariant: the scoping layer never parses names.

---

## What NOT to Touch

- **Do not** `DELETE FROM regions` or `DELETE FROM school_categories` — FK violations will block you anyway, but don't try.
- **Do not** reassign existing UUIDs or primary keys.
- **Do not** change the `isRepublic` flag on any region — only Karakalpakstan (`000...000d`) is `true`.
- **Do not** run `FORCE_SYNC=true` — it drops all tables.
- **Do not** update the Railway region seed migration (`20260521100000-region-model-data-layer.js`) — write a new forward migration instead.

---

## PL-015 Status

As of 2026-05-21: partner data not yet received. Placeholder values in use.  
Track progress in `LOOP_PRE_LAUNCH_CHECKLIST.md` under PL-015.  
This file is the complete recipe — when data arrives, create the migration, run it, verify.
