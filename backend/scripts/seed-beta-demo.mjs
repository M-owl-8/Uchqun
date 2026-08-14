/**
 * Beta demo seed — 5 schools across 2 regions, 4 weeks of history to today.
 *
 * IDENTIFIABILITY (S1): every seeded row carries a machine-only marker — its
 * primary key begins with the hex string `5eed`. Nothing human-visible says
 * "seed", "test" or "demo". Child-scoped rows that keep their own random ids
 * are still reachable by FK from a `5eed…` school/child/user.
 *
 *   IDENTIFY : see IDENTIFY_SQL below (also printed by --identify)
 *   TEARDOWN : node seed-beta-demo.mjs --teardown   (FK-ordered, seed only)
 *
 * IDEMPOTENCY (S2): every insert is `ON CONFLICT (id) DO UPDATE`, so re-running
 * refreshes in place and never duplicates. Day-grained rows (attendance, meals,
 * activities, chat) are deleted for the seeded scope and rewritten each run.
 *
 * PLAUSIBILITY (S3): attendance lands in the 88–96% band per school, absences
 * are clustered (an illness runs 2–4 consecutive days for one child) rather than
 * evenly spaced, group sizes are uneven, and ages match a special-education
 * intake.
 *
 * Usage:
 *   DATABASE_URL=... node backend/scripts/seed-beta-demo.mjs [--purge] [--teardown] [--identify]
 */
import { Client } from 'pg';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const DRY = process.argv.includes('--dry');
const DO_TEARDOWN = process.argv.includes('--teardown');
const DO_PURGE = process.argv.includes('--purge');
const ONLY_IDENTIFY = process.argv.includes('--identify');
// --only=<slug> seeds one school; --teardown-only=<slug> removes one school's seed.
// Both exist to prove S2 (idempotent + reversible) on a single school without
// disturbing the other four.
const ONLY_SLUG = (process.argv.find((a) => a.startsWith('--only=')) || '').split('=')[1] || null;
const TEARDOWN_SLUG = (process.argv.find((a) => a.startsWith('--teardown-only=')) || '').split('=')[1] || null;

const PASSWORD = 'Uchqun@2026';
const TODAY = process.env.SEED_TODAY || new Date().toISOString().slice(0, 10);
const WEEKS = 4;

// ── marker ───────────────────────────────────────────────────────────────────
const MARK = '5eed';
let seq = 0;
/** Deterministic, machine-identifiable UUID: 5eedXXXX-…  */
function sid(kind, ...parts) {
  const h = crypto.createHash('sha1').update(`${kind}::${parts.join('::')}`).digest('hex');
  seq += 1;
  return `${MARK}${h.slice(0, 4)}-${h.slice(4, 8)}-4${h.slice(9, 12)}-8${h.slice(13, 16)}-${h.slice(16, 28)}`;
}

export const IDENTIFY_SQL = `
SELECT 'schools' AS t, count(*) FROM schools  WHERE id::text LIKE '${MARK}%'
UNION ALL SELECT 'users',            count(*) FROM users    WHERE id::text LIKE '${MARK}%'
UNION ALL SELECT 'groups',           count(*) FROM groups   WHERE id::text LIKE '${MARK}%'
UNION ALL SELECT 'children',         count(*) FROM children WHERE id::text LIKE '${MARK}%'
UNION ALL SELECT 'child_attendance', count(*) FROM child_attendance WHERE "schoolId"::text LIKE '${MARK}%'
UNION ALL SELECT 'meals',            count(*) FROM meals    WHERE "childId"::text LIKE '${MARK}%'
UNION ALL SELECT 'activities',       count(*) FROM activities WHERE "childId"::text LIKE '${MARK}%'
UNION ALL SELECT 'media',            count(*) FROM media    WHERE "childId"::text LIKE '${MARK}%'
UNION ALL SELECT 'irrs',             count(*) FROM irrs     WHERE "schoolId"::text LIKE '${MARK}%'
UNION ALL SELECT 'therapies',        count(*) FROM therapies WHERE id::text LIKE '${MARK}%'
UNION ALL SELECT 'therapy_usages',   count(*) FROM therapy_usages WHERE "childId"::text LIKE '${MARK}%'
UNION ALL SELECT 'chat_messages',    count(*) FROM chat_messages WHERE "senderId"::text LIKE '${MARK}%'
UNION ALL SELECT 'documents',        count(*) FROM documents WHERE "userId"::text LIKE '${MARK}%'
UNION ALL SELECT 'journal',          count(*) FROM child_journal_entries WHERE "schoolId"::text LIKE '${MARK}%'
UNION ALL SELECT 'gov_ratings',      count(*) FROM government_school_ratings WHERE "schoolId"::text LIKE '${MARK}%'
UNION ALL SELECT 'audit_log',        count(*) FROM audit_log WHERE "schoolId"::text LIKE '${MARK}%'
ORDER BY 1;`;

const TEARDOWN_SQL = [
  `DELETE FROM audit_log               WHERE "schoolId"::text LIKE '${MARK}%'`,
  `DELETE FROM government_school_ratings WHERE "schoolId"::text LIKE '${MARK}%'`,
  `DELETE FROM child_journal_entries   WHERE "schoolId"::text LIKE '${MARK}%'`,
  `DELETE FROM documents               WHERE "userId"::text  LIKE '${MARK}%'`,
  `DELETE FROM chat_messages           WHERE "senderId"::text LIKE '${MARK}%'`,
  `DELETE FROM therapy_usages          WHERE "childId"::text LIKE '${MARK}%' OR "therapyId"::text LIKE '${MARK}%'`,
  `DELETE FROM therapies               WHERE id::text LIKE '${MARK}%'`,
  `DELETE FROM media                   WHERE "childId"::text LIKE '${MARK}%'`,
  `DELETE FROM activities              WHERE "childId"::text LIKE '${MARK}%'`,
  `DELETE FROM meals                   WHERE "childId"::text LIKE '${MARK}%'`,
  `DELETE FROM child_attendance        WHERE "schoolId"::text LIKE '${MARK}%'`,
  `DELETE FROM irrs                    WHERE "schoolId"::text LIKE '${MARK}%'`,
  `DELETE FROM children                WHERE id::text LIKE '${MARK}%'`,
  `UPDATE groups SET "teacherId" = NULL WHERE id::text LIKE '${MARK}%'`,
  `DELETE FROM users                   WHERE id::text LIKE '${MARK}%'`,
  `DELETE FROM groups                  WHERE id::text LIKE '${MARK}%'`,
  `DELETE FROM schools                 WHERE id::text LIKE '${MARK}%'`,
];

// Prior run's markers (S4). Scoped precisely, nothing else.
const PURGE_SQL = [
  // 'P<n> beta xabar <digits> — ota-ona javobi' is the signature left by earlier
  // automated beta runs in the legacy tenants. Text-only rows, no FK dependants.
  `DELETE FROM chat_messages WHERE content LIKE 'SIM-%' OR content ~ '^P[0-9]+ beta xabar'`,
  `DELETE FROM chat_messages WHERE content LIKE '%Teacher beta test%' OR content LIKE '%Beta test subject%'`,
  `DELETE FROM government_messages WHERE subject LIKE 'SIM-%' OR subject LIKE 'Re: SIM-%'`,
  `DELETE FROM government_school_ratings WHERE comment LIKE 'SIM-%'`,
  `DELETE FROM users WHERE "firstName" LIKE 'SIM-%'`,
];

// ── content pools (realistic Uzbek, no seed/test/demo wording) ────────────────
const REGION_TOSHKENT = '00000000-0000-0000-0000-000000000001';
const REGION_SAMARQAND = '00000000-0000-0000-0000-000000000002';

const SCHOOLS = [
  { slug: 'tmm3', name: 'Toshkent shahar 3-sonli ixtisoslashtirilgan maktabi', region: REGION_TOSHKENT, city: 'Toshkent',  type: 'support',            groups: [7, 5],    dir: ['Nodira', 'Ismoilova'],  rec: ['Gulbahor', 'Tojiyeva'],  tch: [['Zebo', 'Ashurova'], ['Anvar', 'Qosimov']] },
  { slug: 'tmm4', name: 'Toshkent shahar 4-sonli maxsus ta’lim markazi',   region: REGION_TOSHKENT, city: 'Toshkent',  type: 'early_intervention', groups: [6, 4, 5], dir: ['Rustam', 'Yo‘ldoshev'], rec: ['Muhabbat', 'Sattorova'], tch: [['Dildora', 'Rahmonova'], ['Bekzod', 'Umarov'], ['Nilufar', 'Xudoyberdiyeva']] },
  { slug: 'smm3', name: 'Samarqand viloyati 3-sonli madad maktabi',            region: REGION_SAMARQAND, city: 'Samarqand', type: 'support',            groups: [8, 6],    dir: ['Shoira', 'Berdiyeva'],  rec: ['Zilola', 'Ochilova'],   tch: [['Kamola', 'Ergasheva'], ['Jamshid', 'Rasulov']] },
  { slug: 'smm4', name: 'Urgut tumani maxsus ta’lim maktabi',              region: REGION_SAMARQAND, city: 'Urgut',     type: 'daycare',            groups: [5, 5],    dir: ['Otabek', 'Nazriyev'],   rec: ['Sevara', 'Yusupova'],   tch: [['Malika', 'To‘xtayeva'], ['Sanjarbek', 'Ochilov']] },
  { slug: 'smm5', name: 'Kattaqo‘rg‘on tumani erta yordam markazi',   region: REGION_SAMARQAND, city: 'Kattaqo‘rg‘on', type: 'early_preschool', groups: [4, 6], dir: ['Feruza', 'Jo‘rayeva'], rec: ['Nasiba', 'Halimova'], tch: [['Aziza', 'Mirzayeva'], ['Doston', 'Sharipov']] },
];

const GROUP_NAMES = ['Umid', 'Nur', 'Kamalak', 'Bahor'];

const BOY = ['Amirbek', 'Sardor', 'Javohir', 'Bekzod', 'Nurbek', 'Islom', 'Diyorbek', 'Asadbek', 'Shohruh', 'Muhammadali', 'Aziz', 'Temurbek', 'Sanjar', 'Doston', 'Ulug‘bek', 'Xurshid'];
const GIRL = ['Muslima', 'Zilola', 'Sevinch', 'Robiya', 'Nozima', 'Zaynab', 'Sabina', 'Madina', 'Oysha', 'Dilnoza', 'Rayhona', 'Malika', 'Gulnoza', 'Shahzoda', 'Iroda', 'Nafisa'];
const SURNAME = ['Karimov', 'Yusupov', 'Rahimov', 'Abdullayev', 'Toshmatov', 'Ergashev', 'Qodirov', 'Sobirov', 'Xolmatov', 'Nazarov', 'Ismoilov', 'Sharipov', 'Mirzayev', 'Ochilov', 'Umarov', 'Rasulov'];
const F = (s) => (s.endsWith('v') ? `${s}a` : s);

const DIAGNOSES = [
  { d: 'Autizm spektri buzilishi', m: 'F84.0', need: 'Kunlik tartibning barqarorligi, vizual jadval, shovqinga sezgirlik' },
  { d: 'Nutq rivojlanishining kechikishi', m: 'F80.1', need: 'Logoped bilan haftada 3 mashg‘ulot, alternativ kommunikatsiya kartalari' },
  { d: 'Yengil aqliy zaiflik', m: 'F70', need: 'Vazifalarni kichik bosqichlarga bo‘lish, takroriy mustahkamlash' },
  { d: 'Eshitish qobiliyatining pasayishi', m: 'H90.3', need: 'Eshitish apparatini kunlik tekshirish, o‘qituvchiga yuzma-yuz o‘tirish' },
  { d: 'Serebral falaj (yengil shakl)', m: 'G80.1', need: 'Harakat terapiyasi, maxsus o‘rindiq, ovqatlanishda yordam' },
  { d: 'Ko‘rish qobiliyatining pasayishi', m: 'H54.2', need: 'Yirik shriftli materiallar, kontrastli ko‘rgazmalar' },
  { d: 'Diqqat yetishmovchiligi va giperaktivlik', m: 'F90.0', need: 'Qisqa vazifalar, tez-tez harakat tanaffuslari' },
  { d: 'Aralash rivojlanish buzilishi', m: 'F83', need: 'Individual reja bo‘yicha kompleks yondashuv' },
];

const ACTIVITY_POOL = [
  { t: 'Ertalabki doira', d: 'Guruh bilan salomlashish, kun tartibini vizual jadvalda ko‘rib chiqish.', type: 'Social', dur: 20, skill: 'Ijtimoiy muloqot' },
  { t: 'Nutq mashg‘uloti', d: 'Bo‘g‘inlarni takrorlash, rasmli kartalar bo‘yicha nomlash.', type: 'Therapy', dur: 30, skill: 'Nutq' },
  { t: 'Mayda motorika', d: 'Plastilin bilan ishlash, munchoq terish, qaychi bilan qirqish.', type: 'Physical', dur: 25, skill: 'Mayda motorika' },
  { t: 'Sensor o‘yin', d: 'Suv va qum stolida teksturalarni his qilish.', type: 'Therapy', dur: 25, skill: 'Sensor integratsiya' },
  { t: 'Musiqa mashg‘uloti', d: 'Ritmik zarblar, oddiy qo‘shiqlarni birga aytish.', type: 'Learning', dur: 30, skill: 'Eshitish idroki' },
  { t: 'Sanoq va shakllar', d: '1 dan 5 gacha sanash, doira va kvadratni ajratish.', type: 'Learning', dur: 25, skill: 'Matematik tasavvur' },
  { t: 'O‘z-o‘ziga xizmat', d: 'Qo‘l yuvish ketma-ketligi, tugma qadash mashqi.', type: 'Other', dur: 20, skill: 'Mustaqillik' },
  { t: 'Harakatli o‘yin', d: 'Koptok uzatish, to‘siqlardan o‘tish yo‘lakchasi.', type: 'Physical', dur: 30, skill: 'Yirik motorika' },
];

const MEALS = {
  Breakfast: [['Sutli guruch bo‘tqasi', 'Yog‘ va shakar me’yorida'], ['Tuxumli non', 'Qaynatilgan tuxum va sariyog‘'], ['Sutli grechka', 'Mavsumiy meva bilan'], ['Manniy bo‘tqasi', 'Mevali qiyom bilan']],
  Lunch: [['Mastava', 'Sabzavotli, achchiq ziravorsiz'], ['Sabzavotli sho‘rva va kartoshka pyuresi', 'Tovuq go‘shti bilan'], ['Guruchli sho‘rva', 'Yengil, kam tuzli'], ['Makaron va tovuq kotleti', 'Bug‘da pishirilgan']],
  Snack: [['Kefir va pechene', 'Kuniga bir marta'], ['Olma va bosqichli non', 'Maydalangan holda'], ['Sutli kakao va quruq non', 'Iliq holda'], ['Banan va yogurt', 'Shakarsiz']],
};

const CHAT_POOL = [
  ['teacher', 'Assalomu alaykum. Bugun {c} ertalabki doirada juda faol qatnashdi, o‘z navbatini kutishni ham uddaladi.'],
  ['parent', 'Voalaykum assalom, rahmat. Uyda ham navbat kutish mashqini davom ettiryapmiz.'],
  ['teacher', '{c} bugun mayda motorika mashg‘ulotida qaychini mustaqil ushlab turdi. Kichik, lekin muhim qadam.'],
  ['parent', 'Juda xursandmiz. Uyga qanday mashq berishimiz mumkin?'],
  ['teacher', 'Qog‘ozdan tor tasmalar qirqishdan boshlang, kuniga 5 daqiqa yetarli.'],
  ['teacher', 'Ertaga sensor o‘yin bo‘ladi, kiyim ho‘l bo‘lishi mumkin — zaxira kiyim solib yuboring.'],
  ['parent', 'Xabar uchun rahmat, solib yuboraman.'],
];

const ABSENCE_CHAT = [
  ['teacher', '{c} bugun ({d}) kasal deb belgilandi. Ahvoli qanday, shifokorga ko‘rsatdingizmi?'],
  ['parent', 'Kecha kechqurun isitmasi ko‘tarildi, bugun shifokorga bordik. Bir necha kun uyda bo‘ladi.'],
  ['teacher', 'Tuzalib ketsin. Qaytganda mashg‘ulotlarni sekin-asta tiklaymiz, hech qanday muammo yo‘q.'],
];

const THERAPIES = [
  { t: 'Tinchlantiruvchi musiqa to‘plami', ty: 'music', ct: 'audio', dur: 15, ag: 'preschool', dl: 'beginner', d: 'Sensor ortiqcha yuklanishda tinchlanish uchun 15 daqiqalik audio.' },
  { t: 'Nutq mashqlari: bo‘g‘inlar', ty: 'speech', ct: 'video', dur: 20, ag: 'preschool', dl: 'beginner', d: 'Logoped tayyorlagan bosqichma-bosqich video mashqlar.' },
  { t: 'Mayda motorika: kundalik mashqlar', ty: 'occupational', ct: 'document', dur: 25, ag: 'school_age', dl: 'intermediate', d: 'Uy sharoitida bajariladigan 10 ta mashq to‘plami.' },
  { t: 'Harakat terapiyasi asoslari', ty: 'physical', ct: 'video', dur: 30, ag: 'all', dl: 'beginner', d: 'Yirik motorikani rivojlantiruvchi mashqlar.' },
  { t: 'Rangli terapiya mashg‘ulotlari', ty: 'art', ty2: true, ct: 'image', dur: 20, ag: 'preschool', dl: 'beginner', d: 'Rang va shakl orqali hissiy ifoda mashqlari.' },
];

// ── deterministic RNG so re-runs produce the same data ───────────────────────
function rng(seedStr) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) { h ^= seedStr.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (isoStr, n) => { const d = new Date(`${isoStr}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return iso(d); };

/**
 * Multi-row INSERT. One round-trip per chunk instead of per row — the day-grained
 * tables are thousands of rows and the DB is reached over a public proxy.
 */
async function bulk(client, table, cols, rows, chunk = 400) {
  if (!rows.length) return 0;
  let written = 0;
  const quoted = cols.map((c) => `"${c}"`).join(',');
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
    const params = [];
    const tuples = slice.map((row, ri) => {
      const ph = row.map((_, ci) => `$${ri * cols.length + ci + 1}`);
      params.push(...row);
      return `(${ph.join(',')})`;
    });
    const res = await client.query(
      `INSERT INTO ${table} (${quoted}) VALUES ${tuples.join(',')} ON CONFLICT DO NOTHING`,
      params
    );
    written += res.rowCount;
  }
  return written;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();

  if (TEARDOWN_SLUG) {
    const sch = await c.query('SELECT id FROM schools WHERE slug=$1 AND id::text LIKE $2', [TEARDOWN_SLUG, `${MARK}%`]);
    if (!sch.rows.length) { console.log('no seeded school with slug', TEARDOWN_SLUG); await c.end(); return; }
    const sidv = sch.rows[0].id;
    const kids = await c.query('SELECT id FROM children WHERE "schoolId"=$1', [sidv]);
    const kidIds = kids.rows.map((x) => x.id);
    const usr = await c.query('SELECT id FROM users WHERE "schoolId"=$1 AND id::text LIKE $2', [sidv, `${MARK}%`]);
    const usrIds = usr.rows.map((x) => x.id);
    const steps = [
      ['audit_log', 'DELETE FROM audit_log WHERE "schoolId"=$1', [sidv]],
      ['gov_ratings', 'DELETE FROM government_school_ratings WHERE "schoolId"=$1', [sidv]],
      ['journal', 'DELETE FROM child_journal_entries WHERE "schoolId"=$1', [sidv]],
      ['documents', 'DELETE FROM documents WHERE "userId" = ANY($1)', [usrIds]],
      ['chat_messages', 'DELETE FROM chat_messages WHERE "senderId" = ANY($1)', [usrIds]],
      ['therapy_usages', 'DELETE FROM therapy_usages WHERE "childId" = ANY($1)', [kidIds]],
      ['therapies', 'DELETE FROM therapies WHERE "createdBy" = ANY($1) AND id::text LIKE $2', [usrIds, `${MARK}%`]],
      ['media', 'DELETE FROM media WHERE "childId" = ANY($1)', [kidIds]],
      ['activities', 'DELETE FROM activities WHERE "childId" = ANY($1)', [kidIds]],
      ['meals', 'DELETE FROM meals WHERE "childId" = ANY($1)', [kidIds]],
      ['child_attendance', 'DELETE FROM child_attendance WHERE "schoolId"=$1', [sidv]],
      ['irrs', 'DELETE FROM irrs WHERE "schoolId"=$1', [sidv]],
      ['children', 'DELETE FROM children WHERE "schoolId"=$1', [sidv]],
      ['groups_detach', 'UPDATE groups SET "teacherId"=NULL WHERE "schoolId"=$1', [sidv]],
      ['users', 'DELETE FROM users WHERE "schoolId"=$1 AND id::text LIKE $2', [sidv, `${MARK}%`]],
      ['groups', 'DELETE FROM groups WHERE "schoolId"=$1', [sidv]],
      ['schools', 'DELETE FROM schools WHERE id=$1', [sidv]],
    ];
    console.log('── TEARDOWN (single school:', TEARDOWN_SLUG, ') ──');
    for (const [label, q, params] of steps) {
      const rr = await c.query(q, params);
      console.log(`  ${String(rr.rowCount).padStart(5)}  ${label}`);
    }
    console.table((await c.query(IDENTIFY_SQL)).rows);
    await c.end();
    return;
  }

  if (ONLY_IDENTIFY) {
    const r = await c.query(IDENTIFY_SQL);
    console.table(r.rows);
    await c.end();
    return;
  }

  if (DO_PURGE) {
    console.log('── PURGE: prior-run markers (S4) ──');
    for (const q of PURGE_SQL) {
      const r = await c.query(q);
      console.log(`  ${r.rowCount} row(s)  ${q.slice(0, 92)}`);
    }
  }

  if (DO_TEARDOWN) {
    console.log('── TEARDOWN ──');
    for (const q of TEARDOWN_SQL) {
      const r = await c.query(q);
      console.log(`  ${r.rowCount} row(s)  ${q.slice(0, 80)}`);
    }
    const after = await c.query(IDENTIFY_SQL);
    console.table(after.rows);
    await c.end();
    return;
  }

  const pwHash = await bcrypt.hash(PASSWORD, 10);
  const now = new Date().toISOString();
  const summary = [];

  for (const S of SCHOOLS.filter((x) => !ONLY_SLUG || x.slug === ONLY_SLUG)) {
    const r = rng(S.slug);
    const schoolId = sid('school', S.slug);
    const govRating = { tmm3: 4, tmm4: 5, smm3: 3, smm4: 4, smm5: 3 }[S.slug];

    await c.query(
      `INSERT INTO schools (id,name,slug,type,city,"regionId","isActive",address,phone,email,director,"createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,true,$7,$8,$9,$10,now(),now())
       ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, type=EXCLUDED.type, city=EXCLUDED.city,
         "regionId"=EXCLUDED."regionId", address=EXCLUDED.address, phone=EXCLUDED.phone,
         email=EXCLUDED.email, director=EXCLUDED.director, "updatedAt"=now()`,
      [schoolId, S.name, S.slug, S.type, S.city, S.region,
        `${S.city} shahri, Maktab ko‘chasi ${10 + Math.floor(r() * 40)}-uy`,
        `+9987${String(1000000 + Math.floor(r() * 8999999)).slice(0, 7)}`,
        `rahbariyat@${S.slug}.uz`, `${S.dir[0]} ${S.dir[1]}`]
    );

    // director + reception
    const dirId = sid('user', S.slug, 'admin');
    const recId = sid('user', S.slug, 'reception');
    await c.query(
      `INSERT INTO users (id,email,password,"firstName","lastName",role,"schoolId",phone,"isActive","isVerified","documentsApproved",status,"mustChangePassword","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,'admin',$6,$7,true,true,true,'active',false,now(),now())
       ON CONFLICT (id) DO UPDATE SET email=EXCLUDED.email, password=EXCLUDED.password,
         "firstName"=EXCLUDED."firstName", "lastName"=EXCLUDED."lastName", "updatedAt"=now()`,
      [dirId, `direktor@${S.slug}.uz`, pwHash, S.dir[0], S.dir[1], schoolId, '+998901000001']
    );
    await c.query(
      `INSERT INTO users (id,email,password,"firstName","lastName",role,"schoolId",phone,"isActive","isVerified","documentsApproved",status,"mustChangePassword","createdBy","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,'reception',$6,$7,true,true,true,'active',false,$8,now(),now())
       ON CONFLICT (id) DO UPDATE SET email=EXCLUDED.email, password=EXCLUDED.password,
         "firstName"=EXCLUDED."firstName", "lastName"=EXCLUDED."lastName", "updatedAt"=now()`,
      [recId, `qabul@${S.slug}.uz`, pwHash, S.rec[0], S.rec[1], schoolId, '+998901000002', dirId]
    );

    // reception document, already approved by the director → /admin/documents is not empty
    const docId = sid('doc', S.slug);
    await c.query(
      `INSERT INTO documents (id,"userId","documentType","fileName","filePath","fileSize","mimeType",status,"reviewedBy","reviewedAt","createdAt","updatedAt")
       VALUES ($1,$2,'certificate',$3,$4,182340,'application/pdf','approved',$5,now() - interval '19 days', now() - interval '21 days', now())
       ON CONFLICT (id) DO UPDATE SET status='approved', "reviewedBy"=EXCLUDED."reviewedBy", "updatedAt"=now()`,
      [docId, recId, `malaka-guvohnomasi-${S.slug}.pdf`, `/uploads/documents/${docId}.pdf`, dirId]
    );

    // teachers + groups (uneven sizes)
    const teachers = [];
    for (let g = 0; g < S.groups.length; g++) {
      const [fn, ln] = S.tch[g];
      const tId = sid('user', S.slug, `teacher${g}`);
      teachers.push({ id: tId, name: `${fn} ${ln}` });
      await c.query(
        `INSERT INTO users (id,email,password,"firstName","lastName",role,"schoolId",phone,"isActive","isVerified","documentsApproved",status,"mustChangePassword","createdBy","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5,'teacher',$6,$7,true,true,true,'active',false,$8,now(),now())
         ON CONFLICT (id) DO UPDATE SET email=EXCLUDED.email, password=EXCLUDED.password,
           "firstName"=EXCLUDED."firstName", "lastName"=EXCLUDED."lastName", "updatedAt"=now()`,
        [tId, `${['tarbiyachi1', 'tarbiyachi2', 'tarbiyachi3'][g]}@${S.slug}.uz`, pwHash, fn, ln, schoolId, `+99890100001${g}`, recId]
      );
      const grpId = sid('group', S.slug, `g${g}`);
      await c.query(
        `INSERT INTO groups (id,name,description,"teacherId",capacity,"ageRange","schoolId","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,now(),now())
         ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, "teacherId"=EXCLUDED."teacherId",
           capacity=EXCLUDED.capacity, "updatedAt"=now()`,
        [grpId, `${GROUP_NAMES[g]} guruhi`, `${GROUP_NAMES[g]} guruhi — kunlik rejim va individual mashg‘ulotlar`,
          tId, S.groups[g] + 2, ['3-5 yosh', '5-7 yosh', '7-10 yosh'][g], schoolId]
      );
      teachers[g].groupId = grpId;
      teachers[g].groupName = `${GROUP_NAMES[g]} guruhi`;
    }

    // children + parents
    const children = [];
    let idx = 0;
    for (let g = 0; g < S.groups.length; g++) {
      for (let k = 0; k < S.groups[g]; k++) {
        const male = r() < 0.58;
        const sur = pick(r, SURNAME);
        const first = male ? pick(r, BOY) : pick(r, GIRL);
        const last = male ? sur : F(sur);
        const dg = DIAGNOSES[(idx + g) % DIAGNOSES.length];
        const ageYears = 3 + Math.floor(r() * 7);
        const dob = addDays(TODAY, -(ageYears * 365 + Math.floor(r() * 300)));

        const pFirst = male ? pick(r, GIRL) : pick(r, GIRL);
        const pId = sid('user', S.slug, `parent${g}-${k}`);
        const cId = sid('child', S.slug, `c${g}-${k}`);
        await c.query(
          `INSERT INTO users (id,email,password,"firstName","lastName",role,"schoolId","groupId","teacherId",phone,"isActive","isVerified","documentsApproved",status,"mustChangePassword","createdBy","privacyConsentedAt","createdAt","updatedAt")
           VALUES ($1,$2,$3,$4,$5,'parent',$6,$7,$8,$9,true,true,true,'active',false,$10,now() - interval '25 days',now(),now())
           ON CONFLICT (id) DO UPDATE SET email=EXCLUDED.email, password=EXCLUDED.password,
             "firstName"=EXCLUDED."firstName", "lastName"=EXCLUDED."lastName",
             "groupId"=EXCLUDED."groupId", "teacherId"=EXCLUDED."teacherId",
             "privacyConsentedAt"=EXCLUDED."privacyConsentedAt", "updatedAt"=now()`,
          [pId, `otaona${g + 1}${k + 1}@${S.slug}.uz`, pwHash, pFirst, F(sur), schoolId,
            teachers[g].groupId, teachers[g].id, `+9989${String(10000000 + Math.floor(r() * 89999999)).slice(0, 8)}`, recId]
        );
        await c.query(
          `INSERT INTO children (id,"parentId","firstName","lastName","dateOfBirth",gender,"disabilityType","specialNeeds",class,teacher,"schoolId","groupId","medicalDiagnosis","institutionStartDate","emergencyContact","contactPhone",address,"childDescription","createdAt","updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,now(),now())
           ON CONFLICT (id) DO UPDATE SET "firstName"=EXCLUDED."firstName", "lastName"=EXCLUDED."lastName",
             "dateOfBirth"=EXCLUDED."dateOfBirth", "disabilityType"=EXCLUDED."disabilityType",
             "specialNeeds"=EXCLUDED."specialNeeds", "groupId"=EXCLUDED."groupId",
             teacher=EXCLUDED.teacher, "updatedAt"=now()`,
          [cId, pId, first, last, dob, male ? 'Male' : 'Female', dg.d, dg.need,
            `${GROUP_NAMES[g]}`, teachers[g].name, schoolId, teachers[g].groupId, dg.m,
            addDays(TODAY, -(200 + Math.floor(r() * 500))),
            JSON.stringify({ name: `${pFirst} ${F(sur)}`, phone: '+998901234567', relation: 'Ona' }),
            `+9989${String(10000000 + Math.floor(r() * 89999999)).slice(0, 8)}`,
            `${S.city} shahri, ${pick(r, ['Bog‘bon', 'Chinor', 'Navro‘z', 'Guliston'])} ko‘chasi ${1 + Math.floor(r() * 60)}-uy`,
            `${first} ${dg.d.toLowerCase()} tashxisi bilan kuzatilmoqda. ${dg.need}.`]
        );
        children.push({ id: cId, first, last, gid: teachers[g].groupId, tid: teachers[g].id, tname: teachers[g].name, pid: pId, g, dg });
        idx++;
      }
    }

    // ── day-grained history: wipe this school's seeded rows, then rewrite ─────
    await c.query('DELETE FROM child_attendance WHERE "schoolId"=$1', [schoolId]);
    const childIds = children.map((x) => x.id);
    await c.query('DELETE FROM meals WHERE "childId" = ANY($1)', [childIds]);
    await c.query('DELETE FROM activities WHERE "childId" = ANY($1)', [childIds]);
    await c.query('DELETE FROM child_journal_entries WHERE "schoolId"=$1', [schoolId]);
    await c.query('DELETE FROM chat_messages WHERE "senderId" = ANY($1)',
      [[...children.map((x) => x.pid), ...teachers.map((t) => t.id)]]);

    // absence plan: 1–2 illness runs per child over 4 weeks, clustered
    const absencePlan = new Map();
    for (const ch of children) {
      const runs = r() < 0.55 ? 1 : (r() < 0.8 ? 2 : 0);
      for (let n = 0; n < runs; n++) {
        const start = 1 + Math.floor(r() * (WEEKS * 7 - 5));
        const len = 2 + Math.floor(r() * 3);
        const kind = r() < 0.6 ? 'sick' : (r() < 0.5 ? 'home_leave' : 'absent');
        for (let d = 0; d < len; d++) {
          absencePlan.set(`${ch.id}|${addDays(TODAY, -(start + d))}`, kind);
        }
      }
    }

    let attRows = 0; let presentRows = 0;
    const attBuf = []; const mealBuf = []; const actBuf = []; const jrnBuf = [];
    for (let back = WEEKS * 7 - 1; back >= 0; back--) {
      const day = addDays(TODAY, -back);
      const dow = new Date(`${day}T12:00:00Z`).getUTCDay();
      if (dow === 0 || dow === 6) continue; // weekends: no session
      for (const ch of children) {
        const st = absencePlan.get(`${ch.id}|${day}`) || 'present';
        attBuf.push([sid('att', ch.id, day), ch.id, ch.tid, schoolId, day, st, ch.tid,
          JSON.stringify({ firstName: ch.first, lastName: ch.last, schoolId }), `${day}T03:30:00Z`, `${day}T03:30:00Z`]);
        attRows++; if (st === 'present') presentRows++;
      }
      if (back < 21) {
        for (const ch of children) {
          if (absencePlan.get(`${ch.id}|${day}`)) continue;
          for (const mt of ['Breakfast', 'Lunch', 'Snack']) {
            const [nm, note] = pick(r, MEALS[mt]);
            mealBuf.push([sid('meal', ch.id, day, mt), ch.id, day, mt, nm, note,
              pick(r, ['To‘liq', 'Yarim porsiya', 'Ko‘p qismi']),
              r() < 0.18 ? 'Ishtahasi past bo‘ldi' : null,
              { Breakfast: '08:30', Lunch: '12:30', Snack: '15:30' }[mt], r() > 0.12,
              `${day}T04:00:00Z`, `${day}T04:00:00Z`]);
          }
          const a = pick(r, ACTIVITY_POOL);
          actBuf.push([sid('act', ch.id, day), ch.id, day, a.t, a.d, a.type, a.dur, ch.tname,
            pick(r, ['High', 'Medium', 'Medium', 'Low']),
            r() < 0.3 ? `${ch.first} mashg‘ulotni oxirigacha bajardi.` : null, a.skill,
            `${day}T05:00:00Z`, `${day}T05:00:00Z`]);
        }
      }
      if (back < 21 && (dow === 2 || dow === 4)) {
        for (const ch of children.slice(0, 2)) {
          jrnBuf.push([sid('jrn', ch.id, day), ch.id, ch.tid, schoolId, day, 'Kun xulosasi',
            `${ch.first} bugun ${pick(r, ACTIVITY_POOL).t.toLowerCase()}da qatnashdi. ${pick(r, ['Kayfiyati yaxshi edi.', 'Tanaffusdan keyin biroz charchadi.', 'Yangi mashqni tez o‘zlashtirdi.', 'Do‘stlari bilan yaxshi muloqot qildi.'])}`,
            true, JSON.stringify({ firstName: ch.first, lastName: ch.last }),
            `${day}T11:00:00Z`, `${day}T11:00:00Z`]);
        }
      }
    }
    await bulk(c, 'child_attendance', ['id', 'childId', 'teacherId', 'schoolId', 'date', 'status', 'markedBy', 'childSnapshot', 'createdAt', 'updatedAt'], attBuf);
    await bulk(c, 'meals', ['id', 'childId', 'date', 'mealType', 'mealName', 'description', 'quantity', 'specialNotes', 'time', 'eaten', 'createdAt', 'updatedAt'], mealBuf);
    await bulk(c, 'activities', ['id', 'childId', 'date', 'title', 'description', 'type', 'duration', 'teacher', 'studentEngagement', 'notes', 'skill', 'createdAt', 'updatedAt'], actBuf);
    await bulk(c, 'child_journal_entries', ['id', 'childId', 'teacherId', 'schoolId', 'date', 'subject', 'content', 'isVisibleToParent', 'childSnapshot', 'createdAt', 'updatedAt'], jrnBuf);

    // chat threads — a few days apart, one of them about a real absence
    for (const ch of children.slice(0, 3)) {
      const conv = `parent:${ch.pid}`;
      let msgN = 0;
      for (const [role, tpl] of CHAT_POOL) {
        const back = 18 - msgN * 3;
        await c.query(
          `INSERT INTO chat_messages (id,"conversationId","senderId","senderRole",content,"readByParent","readByTeacher","createdAt","updatedAt")
           VALUES ($1,$2,$3,$4,$5,true,true,$6,$6)`,
          [sid('chat', ch.id, String(msgN)), conv, role === 'teacher' ? ch.tid : ch.pid, role,
            tpl.replace('{c}', ch.first), `${addDays(TODAY, -Math.max(back, 2))}T${8 + msgN}:15:00Z`]
        );
        msgN++;
      }
    }
    // absence conversation, anchored on a real absence day
    const absKey = [...absencePlan.keys()].find((k) => k.endsWith(addDays(TODAY, -5)) || true);
    if (absKey) {
      const [absChildId, absDay] = absKey.split('|');
      const ch = children.find((x) => x.id === absChildId);
      if (ch) {
        let n = 0;
        for (const [role, tpl] of ABSENCE_CHAT) {
          await c.query(
            `INSERT INTO chat_messages (id,"conversationId","senderId","senderRole",content,"readByParent","readByTeacher","createdAt","updatedAt")
             VALUES ($1,$2,$3,$4,$5,true,$6,$7,$7)`,
            [sid('chatabs', ch.id, String(n)), `parent:${ch.pid}`,
              role === 'teacher' ? ch.tid : ch.pid, role,
              tpl.replace('{c}', ch.first).replace('{d}', absDay),
              role === 'teacher', `${absDay}T${9 + n}:20:00Z`]
          );
          n++;
        }
      }
    }

    // therapies (library) + usages
    for (let i = 0; i < THERAPIES.length; i++) {
      const th = THERAPIES[i];
      const thId = sid('therapy', S.slug, String(i));
      await c.query(
        `INSERT INTO therapies (id,title,description,"therapyType","contentType",duration,"ageGroup","difficultyLevel",tags,"createdBy","isActive","usageCount",rating,"ratingCount","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,$11,$12,$13,now(),now())
         ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, description=EXCLUDED.description, "updatedAt"=now()`,
        [thId, th.t, th.d, th.ty, th.ct, th.dur, th.ag, th.dl,
          ['maxsus ta’lim', th.ty], teachers[0].id, 3 + Math.floor(r() * 12),
          (3.5 + r() * 1.4).toFixed(1), 2 + Math.floor(r() * 8)]
      );
      await c.query('DELETE FROM therapy_usages WHERE "therapyId"=$1', [thId]);
      for (const ch of children.slice(0, 4)) {
        if (r() < 0.45) continue;
        const day = addDays(TODAY, -(2 + Math.floor(r() * 18)));
        await c.query(
          `INSERT INTO therapy_usages (id,"therapyId","childId","teacherId","startTime","endTime",duration,progress,notes,rating,"createdAt","updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$5,$5)`,
          [sid('tu', thId, ch.id), thId, ch.id, ch.tid, `${day}T10:00:00Z`, `${day}T10:${String(th.dur).padStart(2, '0')}:00Z`,
            th.dur, 40 + Math.floor(r() * 55),
            pick(r, ['Yaxshi qabul qildi.', 'Boshida qiynaldi, keyin moslashdi.', 'Takrorlash tavsiya etiladi.']),
            3 + Math.floor(r() * 3)]
        );
      }
    }

    // IRRs — at least 3 per school
    for (const ch of children.slice(0, 3)) {
      await c.query(
        `INSERT INTO irrs (id,"childId","schoolId","parentId","createdBy",status,"childFullName","dateOfBirth","ageAtAssessmentStart","ptpkIntakeDate","ptpkConclusionDate","ptpkConclusionNumber","ptpkDiagnosis","irrStartDate","additionalInfo","childStrengths","riskFactors","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5,'active',$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,now(),now())
         ON CONFLICT (id) DO UPDATE SET status='active', "ptpkDiagnosis"=EXCLUDED."ptpkDiagnosis", "updatedAt"=now()`,
        [sid('irr', ch.id), ch.id, schoolId, ch.pid, ch.tid,
          `${ch.last} ${ch.first}`, addDays(TODAY, -(4 * 365)), `${4 + Math.floor(r() * 5)} yosh ${Math.floor(r() * 11)} oy`,
          addDays(TODAY, -180), addDays(TODAY, -160),
          `PKT-${String(100 + Math.floor(r() * 800))}`,
          `${ch.dg.m} — ${ch.dg.d}`, addDays(TODAY, -150),
          `Reja choraklik monitoring asosida qayta ko‘rib chiqiladi.`,
          pick(r, ['Rasm chizishni yaxshi ko‘radi, ranglarni ajratadi.', 'Musiqaga sezgir, ritmni takrorlaydi.', 'Kattalar bilan ko‘z aloqasini o‘rnatadi.', 'Kundalik tartibni yaxshi eslab qoladi.']),
          pick(r, ['Shovqinli muhitda tez charchaydi.', 'Ovqatlanishda tanlab yeydi.', 'Tartib buzilganda bezovtalanadi.'])]
      );
    }

    // government rating (mixed, not all 4/5)
    const govUser = { [REGION_TOSHKENT]: 'gov.toshkent@uchqun.uz', [REGION_SAMARQAND]: 'gov.samarqand@uchqun.uz' }[S.region];
    const gu = await c.query('SELECT id FROM users WHERE email=$1', [govUser]);
    if (gu.rows.length) {
      await c.query(
        `INSERT INTO government_school_ratings (id,"schoolId","govUserId",period,stars,indicators,comment,"createdAt","updatedAt")
         VALUES ($1,$2,$3,'Q2-2026',$4,$5,$6, now() - interval '30 days', now() - interval '30 days')
         ON CONFLICT (id) DO UPDATE SET stars=EXCLUDED.stars, indicators=EXCLUDED.indicators,
           comment=EXCLUDED.comment, "updatedAt"=now()`,
        [sid('govrate', S.slug), schoolId, gu.rows[0].id, govRating,
          JSON.stringify({
            gov_indicator_1: govRating, gov_indicator_2: Math.max(2, govRating - 1),
            gov_indicator_3: govRating, gov_indicator_4: Math.min(5, govRating + 1),
            gov_indicator_5: govRating,
          }),
          {
            5: 'Muassasa faoliyati yuqori darajada tashkil etilgan, hujjatlar tartibda.',
            4: 'Umumiy holat qoniqarli. Individual rejalarni yangilash tavsiya etiladi.',
            3: 'Davomat hisobi to‘liq yuritilmoqda, ammo terapiya mashg‘ulotlari yetarli emas.',
          }[govRating]]
      );
    }

    // audit-log history so /government/audit-log has dated rows
    await c.query('DELETE FROM audit_log WHERE "schoolId"=$1', [schoolId]);
    const auditActions = [
      ['create', 'receptions', recId, dirId, 'admin', 21],
      ['approve', 'documents', docId, dirId, 'admin', 19],
      ['create', 'teachers', teachers[0].id, recId, 'reception', 18],
      ['create', 'parents', children[0].pid, recId, 'reception', 16],
      ['bulk_import', 'children', children[1].id, recId, 'reception', 15],
      ['update', 'groups', teachers[0].groupId, dirId, 'admin', 9],
      ['create', 'irr', children[0].id, teachers[0].id, 'teacher', 6],
    ];
    for (const [action, entity, entityId, actorId, actorRole, back] of auditActions) {
      await c.query(
        `INSERT INTO audit_log ("actorId","actorRole",action,entity,"entityId","schoolId",meta,"occurredAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7, now() - ($8 || ' days')::interval)`,
        [actorId, actorRole, action, entity, entityId, schoolId, JSON.stringify({ school: S.slug }), String(back)]
      );
    }

    const pct = Math.round((presentRows / attRows) * 100);
    summary.push({ slug: S.slug, name: S.name, groups: S.groups.length, children: children.length, teachers: teachers.length, attendanceRows: attRows, presentPct: pct, govStars: govRating });
    console.log(`  ${S.slug}: ${children.length} children, ${teachers.length} teachers, ${attRows} attendance rows, ${pct}% present, gov ${govRating}★`);
  }

  console.log('\n── SUMMARY ──');
  console.table(summary);
  const r = await c.query(IDENTIFY_SQL);
  console.log('── IDENTIFY ──');
  console.table(r.rows);
  console.log('seed completed at', now);
  await c.end();
}

if (!DRY) main().catch((e) => { console.error('SEED FAILED:', e.message, e.stack); process.exit(1); });
