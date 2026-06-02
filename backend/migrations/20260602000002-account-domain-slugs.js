// GOV-ACCOUNT-DOMAINS: Add slug fields to schools and regions for email domain enforcement.
// Schools get deterministic short slugs; regions get human-readable slugs.
// Existing user accounts are NOT changed (Option A: only new accounts follow the discipline).

export const up = async (queryInterface, Sequelize) => {
  // ── 1. Add slug to regions ────────────────────────────────────────────────
  await queryInterface.addColumn('regions', 'slug', {
    type: Sequelize.STRING(32),
    allowNull: true, // nullable during migration; unique after backfill
  });

  // Backfill region slugs by code (code = r01–r14, assigned in GOV-REGIONS-NAME)
  const regionSlugs = {
    r01: 'toshkent',
    r02: 'samarqand',
    r03: 'andijon',
    r04: 'buxoro',
    r05: 'fargona',
    r06: 'jizzax',
    r07: 'namangan',
    r08: 'navoiy',
    r09: 'qashqadaryo',
    r10: 'sirdaryo',
    r11: 'surxondaryo',
    r12: 'toshkent-viloyati',
    r13: 'qoraqalpogiston',
    r14: 'xorazm',
  };
  for (const [code, slug] of Object.entries(regionSlugs)) {
    await queryInterface.sequelize.query(
      `UPDATE regions SET slug = :slug WHERE code = :code`,
      { replacements: { slug, code } }
    );
  }

  // Any remaining regions without a slug get an auto-generated one from their name
  await queryInterface.sequelize.query(`
    UPDATE regions
    SET slug = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(name, '[^a-zA-Z0-9 -]', '', 'g'), ' +', '-', 'g'))
    WHERE slug IS NULL
  `);

  await queryInterface.sequelize.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_regions_slug ON regions (slug)`
  );
  // Now make NOT NULL
  await queryInterface.changeColumn('regions', 'slug', {
    type: Sequelize.STRING(32),
    allowNull: false,
  });

  // ── 2. Add slug to schools ────────────────────────────────────────────────
  await queryInterface.addColumn('schools', 'slug', {
    type: Sequelize.STRING(32),
    allowNull: true,
  });

  // Backfill known seed schools by ID
  const schoolSlugs = [
    { id: 'eec19bb5-36ae-4006-a330-031d07654c40', slug: 'tmm1' },
    { id: '7b27fadd-3532-4e53-a5e3-79bc652a947f', slug: 'tmm2' },
    { id: '2dac6af4-96c9-4c4f-8430-aac62440f4e5', slug: 'smm1' },
    { id: '5334e23c-a749-4808-8b9a-1f8c67aa1938', slug: 'smm2' },
  ];
  for (const { id, slug } of schoolSlugs) {
    await queryInterface.sequelize.query(
      `UPDATE schools SET slug = :slug WHERE id = :id`,
      { replacements: { slug, id } }
    );
  }

  // Any remaining schools get auto-generated slugs from abbreviation
  await queryInterface.sequelize.query(`
    UPDATE schools
    SET slug = LOWER(
      LEFT(
        REGEXP_REPLACE(
          REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '', 'g'),
          '([A-Z])', '\\1', 'g'
        ),
        16
      )
    ) || EXTRACT(EPOCH FROM "createdAt")::bigint::text
    WHERE slug IS NULL
  `);

  // Fallback: ensure uniqueness with a numeric suffix for any collisions
  await queryInterface.sequelize.query(`
    UPDATE schools s
    SET slug = s.slug || '-' || (
      SELECT COUNT(*) FROM schools s2
      WHERE s2.slug = s.slug AND s2."createdAt" < s."createdAt"
    )::text
    WHERE id IN (
      SELECT id FROM (
        SELECT id, slug, ROW_NUMBER() OVER (PARTITION BY slug ORDER BY "createdAt") AS rn
        FROM schools WHERE slug IS NOT NULL
      ) t WHERE rn > 1
    )
  `);

  await queryInterface.sequelize.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_schools_slug ON schools (slug)`
  );
  await queryInterface.changeColumn('schools', 'slug', {
    type: Sequelize.STRING(32),
    allowNull: false,
  });
};

export const down = async (queryInterface) => {
  await queryInterface.sequelize.query(`DROP INDEX IF EXISTS idx_schools_slug`);
  await queryInterface.removeColumn('schools', 'slug');
  await queryInterface.sequelize.query(`DROP INDEX IF EXISTS idx_regions_slug`);
  await queryInterface.removeColumn('regions', 'slug');
};
