// CP-021 Region model data layer — Sprint A.
// Additive only: no existing column is modified; no existing row breaks.
// down() is fully reversible.
export const up = async (queryInterface, Sequelize) => {
  // ── 1. regions table ────────────────────────────────────────────────────────
  await queryInterface.createTable('regions', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
      primaryKey: true,
    },
    code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
    name: { type: Sequelize.STRING(255), allowNull: false },
    isRepublic: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
    createdAt: { type: Sequelize.DATE, allowNull: false },
    updatedAt: { type: Sequelize.DATE, allowNull: false },
  });
  await queryInterface.sequelize.query(
    `CREATE INDEX IF NOT EXISTS idx_regions_code ON regions (code)`
  );

  // ── 2. districts table (metadata-only; no auth enforcement) ─────────────────
  await queryInterface.createTable('districts', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
      primaryKey: true,
    },
    regionId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'regions', key: 'id' },
      onDelete: 'RESTRICT',
    },
    code: { type: Sequelize.STRING(50), allowNull: true },
    name: { type: Sequelize.STRING(255), allowNull: false },
    createdAt: { type: Sequelize.DATE, allowNull: false },
    updatedAt: { type: Sequelize.DATE, allowNull: false },
  });

  // ── 3. schools: add regionId + districtId (nullable FKs) ────────────────────
  await queryInterface.addColumn('schools', 'regionId', {
    type: Sequelize.UUID,
    allowNull: true,
    references: { model: 'regions', key: 'id' },
    onDelete: 'SET NULL',
  });
  await queryInterface.addColumn('schools', 'districtId', {
    type: Sequelize.UUID,
    allowNull: true,
    references: { model: 'districts', key: 'id' },
    onDelete: 'SET NULL',
  });
  await queryInterface.sequelize.query(
    `CREATE INDEX IF NOT EXISTS idx_schools_region_id ON schools ("regionId")`
  );

  // ── 4. users: new gov columns ────────────────────────────────────────────────
  // Using STRING + CHECK instead of native ENUM — matches the status column pattern.
  await queryInterface.addColumn('users', 'govLevel', {
    type: Sequelize.STRING(20),
    allowNull: true,
  });
  await queryInterface.sequelize.query(`
    DO $$ BEGIN
      ALTER TABLE users ADD CONSTRAINT users_gov_level_check
        CHECK ("govLevel" IN ('republic', 'region'));
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await queryInterface.addColumn('users', 'govType', {
    type: Sequelize.STRING(20),
    allowNull: true,
  });
  await queryInterface.sequelize.query(`
    DO $$ BEGIN
      ALTER TABLE users ADD CONSTRAINT users_gov_type_check
        CHECK ("govType" IN ('main', 'secondary'));
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await queryInterface.addColumn('users', 'govRegionId', {
    type: Sequelize.UUID,
    allowNull: true,
    references: { model: 'regions', key: 'id' },
    onDelete: 'SET NULL',
  });
  await queryInterface.addColumn('users', 'govAccessGrants', {
    type: Sequelize.JSONB,
    allowNull: true,
  });
  await queryInterface.addColumn('users', 'mustChangePassword', {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });

  // ── 5. Seed 13 placeholder regions (r01–r13) ─────────────────────────────────
  // Region 13 = Karakalpakstan (dependent republic), isRepublic = true.
  // Stable UUIDs so tests can reference them by well-known ID.
  // Real names/codes replace these in Sprint D (PL-015 data-swap).
  const now = new Date().toISOString();
  const regions = Array.from({ length: 13 }, (_, i) => {
    const n = i + 1;
    const num = String(n).padStart(2, '0');
    return {
      id: `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`,
      code: `r${num}`,
      name: `Region ${num}`,
      isRepublic: n === 13,
      createdAt: now,
      updatedAt: now,
    };
  });
  await queryInterface.bulkInsert('regions', regions);

  // ── 6. Backfill existing government accounts ──────────────────────────────────
  // All existing government users → republic + main + full access.
  // Going forward the provisioning flow prevents new republic-main creation;
  // existing accounts are grandfathered. The last-republic-main guard (not any-republic-main)
  // protects against accidentally destroying the root account.
  await queryInterface.sequelize.query(`
    UPDATE users
    SET "govLevel" = 'republic',
        "govType" = 'main',
        "govRegionId" = NULL,
        "govAccessGrants" = NULL,
        "mustChangePassword" = false
    WHERE role = 'government'
  `);
};

export const down = async (queryInterface) => {
  // Reverse in strict dependency order: remove FK columns first, then drop tables.
  await queryInterface.sequelize.query(
    `ALTER TABLE users DROP CONSTRAINT IF EXISTS users_gov_level_check`
  );
  await queryInterface.sequelize.query(
    `ALTER TABLE users DROP CONSTRAINT IF EXISTS users_gov_type_check`
  );
  await queryInterface.removeColumn('users', 'mustChangePassword').catch(() => {});
  await queryInterface.removeColumn('users', 'govAccessGrants').catch(() => {});
  await queryInterface.removeColumn('users', 'govRegionId').catch(() => {});
  await queryInterface.removeColumn('users', 'govType').catch(() => {});
  await queryInterface.removeColumn('users', 'govLevel').catch(() => {});

  await queryInterface.sequelize.query(`DROP INDEX IF EXISTS idx_schools_region_id`);
  await queryInterface.removeColumn('schools', 'districtId').catch(() => {});
  await queryInterface.removeColumn('schools', 'regionId').catch(() => {});

  // districts references regions — must drop districts first.
  await queryInterface.dropTable('districts');
  await queryInterface.sequelize.query(`DROP INDEX IF EXISTS idx_regions_code`);
  await queryInterface.dropTable('regions');
};
