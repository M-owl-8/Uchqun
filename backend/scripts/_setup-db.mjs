import { Sequelize } from 'sequelize';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const s = new Sequelize(process.env.DATABASE_PUBLIC_URL, {
  dialect: 'postgres', logging: false,
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
});
await s.authenticate();

// Add missing columns to users
for (const col of [
  'ADD COLUMN IF NOT EXISTS "groupId" UUID',
  'ADD COLUMN IF NOT EXISTS "schoolId" UUID',
  'ADD COLUMN IF NOT EXISTS "teacherId" UUID',
  'ADD COLUMN IF NOT EXISTS "createdBy" UUID',
  'ADD COLUMN IF NOT EXISTS status VARCHAR(255) DEFAULT \'active\'',
  'ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP',
]) {
  await s.query(`ALTER TABLE users ${col}`).catch(e => console.log('users skip:', e.message.split('\n')[0]));
}

// Add missing columns to children
for (const col of [
  'ADD COLUMN IF NOT EXISTS "schoolId" UUID',
  'ADD COLUMN IF NOT EXISTS "groupId" UUID',
  'ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP',
]) {
  await s.query(`ALTER TABLE children ${col}`).catch(e => console.log('children skip:', e.message.split('\n')[0]));
}
console.log('✓ Missing columns added');

// Create groups table if not exists
await s.query(`
  CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    "teacherId" UUID REFERENCES users(id),
    capacity INTEGER NOT NULL DEFAULT 20,
    "ageRange" VARCHAR(50),
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
  )
`).catch(e => console.log('groups skip:', e.message.split('\n')[0]));
console.log('✓ groups table ready');

// Create notifications table if not exists
await s.query(`
  DO $$ BEGIN
    CREATE TYPE "enum_notifications_type" AS ENUM ('activity','meal','media','progress','general');
  EXCEPTION WHEN duplicate_object THEN null; END $$;
  DO $$ BEGIN
    CREATE TYPE "enum_notifications_relatedType" AS ENUM ('activity','meal','media','progress');
  EXCEPTION WHEN duplicate_object THEN null; END $$;
`).catch(e => console.log('notif enum skip:', e.message.split('\n')[0]));
await s.query(`
  CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "childId" UUID REFERENCES children(id) ON DELETE CASCADE,
    type "enum_notifications_type" NOT NULL,
    title VARCHAR(500) NOT NULL,
    message TEXT NOT NULL,
    "relatedId" UUID,
    "relatedType" "enum_notifications_relatedType",
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
  )
`).catch(e => console.log('notifications skip:', e.message.split('\n')[0]));
console.log('✓ notifications table ready');

// Create news table if not exists
await s.query(`
  DO $$ BEGIN
    CREATE TYPE "enum_news_targetAudience" AS ENUM ('all','parents','teachers','admins');
  EXCEPTION WHEN duplicate_object THEN null; END $$;
`).catch(e => console.log('news enum skip:', e.message.split('\n')[0]));
await s.query(`
  CREATE TABLE IF NOT EXISTS news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    published BOOLEAN NOT NULL DEFAULT false,
    "targetAudience" "enum_news_targetAudience" NOT NULL DEFAULT 'all',
    "createdById" UUID NOT NULL REFERENCES users(id),
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
  )
`).catch(e => console.log('news skip:', e.message.split('\n')[0]));
console.log('✓ news table ready');

// Create ai_warnings table if not exists
await s.query(`
  DO $$ BEGIN
    CREATE TYPE "enum_ai_warnings_warningType" AS ENUM ('low_rating','declining_rating','negative_feedback','complaint','safety_concern','quality_issue','other');
  EXCEPTION WHEN duplicate_object THEN null; END $$;
  DO $$ BEGIN
    CREATE TYPE "enum_ai_warnings_severity" AS ENUM ('low','medium','high','critical');
  EXCEPTION WHEN duplicate_object THEN null; END $$;
  DO $$ BEGIN
    CREATE TYPE "enum_ai_warnings_targetType" AS ENUM ('school','parent','teacher','child');
  EXCEPTION WHEN duplicate_object THEN null; END $$;
`).catch(e => console.log('ai enum skip:', e.message.split('\n')[0]));
await s.query(`
  CREATE TABLE IF NOT EXISTS ai_warnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "warningType" "enum_ai_warnings_warningType" NOT NULL,
    severity "enum_ai_warnings_severity" NOT NULL DEFAULT 'medium',
    "targetType" "enum_ai_warnings_targetType" NOT NULL,
    "targetId" UUID NOT NULL,
    "schoolId" UUID REFERENCES schools(id),
    "parentId" UUID REFERENCES users(id),
    title VARCHAR(500) NOT NULL,
    message TEXT NOT NULL,
    "aiAnalysis" TEXT,
    "ratingData" JSONB,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP,
    "resolvedBy" UUID REFERENCES users(id),
    "resolutionNotes" TEXT,
    "notifiedUsers" UUID[],
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
  )
`).catch(e => console.log('ai_warnings skip:', e.message.split('\n')[0]));
console.log('✓ ai_warnings table ready');

// Create government_stats table if not exists
await s.query(`
  DO $$ BEGIN
    CREATE TYPE "enum_government_stats_statType" AS ENUM ('overview','schools','students','teachers','ratings','therapies','activities','complaints');
  EXCEPTION WHEN duplicate_object THEN null; END $$;
  DO $$ BEGIN
    CREATE TYPE "enum_government_stats_period" AS ENUM ('daily','weekly','monthly','quarterly','yearly');
  EXCEPTION WHEN duplicate_object THEN null; END $$;
`).catch(e => console.log('gov enum skip:', e.message.split('\n')[0]));
await s.query(`
  CREATE TABLE IF NOT EXISTS government_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region VARCHAR(255),
    district VARCHAR(255),
    "schoolId" UUID REFERENCES schools(id),
    "statType" "enum_government_stats_statType" NOT NULL,
    period "enum_government_stats_period" NOT NULL,
    "periodStart" TIMESTAMP NOT NULL,
    "periodEnd" TIMESTAMP NOT NULL,
    data JSONB NOT NULL,
    summary JSONB,
    "generatedBy" UUID REFERENCES users(id),
    "generatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
  )
`).catch(e => console.log('government_stats skip:', e.message.split('\n')[0]));
console.log('✓ government_stats table ready');

// Create business_stats table if not exists
await s.query(`
  DO $$ BEGIN
    CREATE TYPE "enum_business_stats_statType" AS ENUM ('overview','users','usage');
  EXCEPTION WHEN duplicate_object THEN null; END $$;
  DO $$ BEGIN
    CREATE TYPE "enum_business_stats_period" AS ENUM ('daily','weekly','monthly','quarterly','yearly');
  EXCEPTION WHEN duplicate_object THEN null; END $$;
`).catch(e => console.log('biz enum skip:', e.message.split('\n')[0]));
await s.query(`
  CREATE TABLE IF NOT EXISTS business_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "businessId" UUID NOT NULL REFERENCES users(id),
    "statType" "enum_business_stats_statType" NOT NULL,
    period "enum_business_stats_period" NOT NULL,
    "periodStart" TIMESTAMP NOT NULL,
    "periodEnd" TIMESTAMP NOT NULL,
    data JSONB NOT NULL,
    summary JSONB,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "generatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
  )
`).catch(e => console.log('business_stats skip:', e.message.split('\n')[0]));
console.log('✓ business_stats table ready');

// Update or create teacher account with simple password
const teacherHash = await bcrypt.hash('Teacher2026', 10);
await s.query(`
  INSERT INTO users (id, email, password, "firstName", "lastName", role, "isActive", "isVerified", "createdAt", "updatedAt")
  VALUES (:id, 'teacher@uchqun.uz', :hash, 'Demo', 'Teacher', 'teacher', true, true, NOW(), NOW())
  ON CONFLICT (email) DO UPDATE SET password = :hash, "isActive" = true, "isVerified" = true
`, { replacements: { id: randomUUID(), hash: teacherHash } });

// Update or create parent account
const parentHash = await bcrypt.hash('Parent2026', 10);
await s.query(`
  INSERT INTO users (id, email, password, "firstName", "lastName", role, "isActive", "isVerified", "createdAt", "updatedAt")
  VALUES (:id, 'parent@uchqun.uz', :hash, 'Demo', 'Parent', 'parent', true, true, NOW(), NOW())
  ON CONFLICT (email) DO UPDATE SET password = :hash, "isActive" = true, "isVerified" = true
`, { replacements: { id: randomUUID(), hash: parentHash } });

console.log('✓ Accounts ready');
console.log('  teacher@uchqun.uz / Teacher2026');
console.log('  parent@uchqun.uz  / Parent2026');
await s.close();
