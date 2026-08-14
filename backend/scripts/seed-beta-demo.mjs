/**
 * Beta demo seed — 6 schools across 3 regions, one of them at volume.
 *
 * IDENTIFIABILITY (S1): every seeded row carries a machine-only marker — its
 * primary key begins with the hex string `5eed`. Nothing human-visible says
 * "seed", "test" or "demo". Child-scoped rows that keep their own random ids
 * are still reachable by FK from a `5eed…` school/child/user.
 *
 *   IDENTIFY : node seed-beta-demo.mjs --identify
 *   TEARDOWN : node seed-beta-demo.mjs --teardown
 *              node seed-beta-demo.mjs --teardown-only=<slug>
 *   PARTIAL  : node seed-beta-demo.mjs --only=<slug>
 *
 * IDEMPOTENCY (S2): ids are sha1-derived from (kind, school, index), so a
 * re-run rewrites the same rows rather than duplicating. Day-grained tables are
 * deleted for the seeded scope and rewritten each run.
 *
 * PLAUSIBILITY (S3): absences are clustered as 2–4 day illness runs, not evenly
 * spaced. The resulting attendance percentage is whatever it is — it is NOT
 * tuned to hit a band. Group sizes are uneven; ages match a special-education
 * intake.
 *
 * NOT REPRESENTABLE IN THIS SCHEMA (reported, not faked):
 *   - a second guardian on one child: children.parentId is a single NOT NULL FK
 *     and no guardian join table exists (D-19)
 *   - a group with two teachers: groups.teacherId is a single FK (D-20)
 *   A teacher in two groups IS representable and is seeded (tmm3 t0 owns g0+g5).
 */
import { Client } from 'pg';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const DO_TEARDOWN = process.argv.includes('--teardown');
const DO_PURGE = process.argv.includes('--purge');
const ONLY_IDENTIFY = process.argv.includes('--identify');
const ONLY_SLUG = (process.argv.find((a) => a.startsWith('--only=')) || '').split('=')[1] || null;
const TEARDOWN_SLUG = (process.argv.find((a) => a.startsWith('--teardown-only=')) || '').split('=')[1] || null;

const PASSWORD = 'Uchqun@2026';
const TODAY = process.env.SEED_TODAY || new Date().toISOString().slice(0, 10);

const MARK = '5eed';
function sid(kind, ...parts) {
  const h = crypto.createHash('sha1').update(`${kind}::${parts.join('::')}`).digest('hex');
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

const PURGE_SQL = [
  `DELETE FROM chat_messages WHERE content LIKE 'SIM-%' OR content ~ '^P[0-9]+ beta xabar'`,
  `DELETE FROM chat_messages WHERE content LIKE '%Teacher beta test%' OR content LIKE '%Beta test subject%'`,
  `DELETE FROM government_messages WHERE subject LIKE 'SIM-%' OR subject LIKE 'Re: SIM-%'`,
  `DELETE FROM government_school_ratings WHERE comment LIKE 'SIM-%'`,
  `DELETE FROM users WHERE "firstName" LIKE 'SIM-%'`,
];

const R_TOSHKENT = '00000000-0000-0000-0000-000000000001';
const R_SAMARQAND = '00000000-0000-0000-0000-000000000002';
const R_ANDIJON = '00000000-0000-0000-0000-000000000003';

/**
 * groupTeacher: index into `tch` that owns each group. Repeating an index makes
 * that teacher own two groups. Teachers not listed have no group — a real case
 * (visiting specialists) and the D-01 "no group ⇒ no children" path.
 */
const SCHOOLS = [
  {
    slug: 'tmm3', name: 'Toshkent shahar 3-sonli ixtisoslashtirilgan maktabi',
    region: R_TOSHKENT, city: 'Toshkent', type: 'support',
    groups: [12, 11, 10, 10, 9, 9], groupTeacher: [0, 1, 2, 3, 4, 0], weeks: 12, volume: true,
    dir: ['Nodira', 'Ismoilova'],
    rec: [['Gulbahor', 'Tojiyeva'], ['Dilrabo', 'Qosimova']],
    tch: [['Zebo', 'Ashurova'], ['Anvar', 'Qosimov'], ['Nigora', 'Sultonova'], ['Bahodir', 'Eshonov'],
      ['Sitora', 'Yo‘ldosheva'], ['Farrux', 'Ne’matov'], ['Ozoda', 'Rasulova'], ['Jasur', 'Turgunov']],
  },
  {
    slug: 'tmm4', name: 'Toshkent shahar 4-sonli maxsus ta’lim markazi',
    region: R_TOSHKENT, city: 'Toshkent', type: 'early_intervention',
    groups: [6, 4, 5], groupTeacher: [0, 1, 2], weeks: 4,
    dir: ['Rustam', 'Yo‘ldoshev'],
    rec: [['Muhabbat', 'Sattorova'], ['Zulfiya', 'Ergasheva']],
    tch: [['Dildora', 'Rahmonova'], ['Bekzod', 'Umarov'], ['Nilufar', 'Xudoyberdiyeva']],
  },
  {
    slug: 'smm3', name: 'Samarqand viloyati 3-sonli madad maktabi',
    region: R_SAMARQAND, city: 'Samarqand', type: 'support',
    groups: [8, 6], groupTeacher: [0, 1], weeks: 4,
    dir: ['Shoira', 'Berdiyeva'],
    rec: [['Zilola', 'Ochilova'], ['Maftuna', 'Nazarova']],
    tch: [['Kamola', 'Ergasheva'], ['Jamshid', 'Rasulov'], ['Barno', 'Sobirova']],
  },
  {
    slug: 'smm4', name: 'Urgut tumani maxsus ta’lim maktabi',
    region: R_SAMARQAND, city: 'Urgut', type: 'daycare',
    groups: [5, 5], groupTeacher: [0, 1], weeks: 4,
    dir: ['Otabek', 'Nazriyev'],
    rec: [['Sevara', 'Yusupova'], ['Gulchehra', 'Ismoilova']],
    tch: [['Malika', 'To‘xtayeva'], ['Sanjarbek', 'Ochilov'], ['Dilfuza', 'Karimova']],
  },
  {
    slug: 'smm5', name: 'Kattaqo‘rg‘on tumani erta yordam markazi',
    region: R_SAMARQAND, city: 'Kattaqo‘rg‘on', type: 'early_preschool',
    groups: [4, 6], groupTeacher: [0, 1], weeks: 4,
    dir: ['Feruza', 'Jo‘rayeva'],
    rec: [['Nasiba', 'Halimova'], ['Shahnoza', 'Umarova']],
    tch: [['Aziza', 'Mirzayeva'], ['Doston', 'Sharipov'], ['Munisa', 'Toshmatova']],
  },
  {
    // Third region — gives region isolation a genuine two-sided case.
    slug: 'amm1', name: 'Andijon viloyati 1-sonli maxsus ta’lim maktabi',
    region: R_ANDIJON, city: 'Andijon', type: 'support',
    groups: [6, 5], groupTeacher: [0, 1], weeks: 4,
    dir: ['Ulug‘bek', 'Mamatqulov'],
    rec: [['Ra’no', 'Abdullayeva'], ['Xosiyat', 'Tursunova']],
    tch: [['Mohira', 'Yusupova'], ['Islomjon', 'Ergashev'], ['Nargiza', 'Qodirova']],
  },
];

const GROUP_NAMES = ['Umid', 'Nur', 'Kamalak', 'Bahor', 'Chinor', 'Yulduz'];
const AGE_RANGES = ['3-5 yosh', '5-7 yosh', '7-10 yosh', '4-6 yosh', '6-8 yosh', '8-11 yosh'];

const BOY = ['Amirbek', 'Sardor', 'Javohir', 'Bekzod', 'Nurbek', 'Islom', 'Diyorbek', 'Asadbek', 'Shohruh', 'Muhammadali', 'Aziz', 'Temurbek', 'Sanjar', 'Doston', 'Ulug‘bek', 'Xurshid', 'Otabek', 'Ravshan', 'Jahongir', 'Sirojiddin'];
const GIRL = ['Muslima', 'Zilola', 'Sevinch', 'Robiya', 'Nozima', 'Zaynab', 'Sabina', 'Madina', 'Oysha', 'Dilnoza', 'Rayhona', 'Malika', 'Gulnoza', 'Shahzoda', 'Iroda', 'Nafisa', 'Mohira', 'Sarvinoz', 'Zebo', 'Kamola'];
const SURNAME = ['Karimov', 'Yusupov', 'Rahimov', 'Abdullayev', 'Toshmatov', 'Ergashev', 'Qodirov', 'Sobirov', 'Xolmatov', 'Nazarov', 'Ismoilov', 'Sharipov', 'Mirzayev', 'Ochilov', 'Umarov', 'Rasulov', 'Tursunov', 'Jo‘rayev', 'Ne’matov', 'Sultonov'];
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

/** 18 turns — long enough to test ordering and scrollback. */
const LONG_CHAT = [
  ['teacher', 'Assalomu alaykum. Bugun {c} ertalabki doirada juda faol qatnashdi.'],
  ['parent', 'Voalaykum assalom, rahmat. Uyda ham shu haqda gapirdi.'],
  ['teacher', '{c} bugun o‘z navbatini kutishni uddaladi — bu biz uchun katta qadam.'],
  ['parent', 'Juda xursandmiz. Uyda qanday mashq qilaylik?'],
  ['teacher', 'Oddiy navbatli o‘yinlar yetarli: qo‘lma-qo‘l koptok, navbat bilan rasm chizish.'],
  ['parent', 'Tushunarli, bugundan boshlaymiz.'],
  ['teacher', 'Ertaga sensor o‘yin bo‘ladi, kiyim ho‘l bo‘lishi mumkin — zaxira kiyim solib yuboring.'],
  ['parent', 'Solib yubordim, rahmat ogohlantirganingiz uchun.'],
  ['teacher', 'Bugun mayda motorika mashg‘ulotida qaychini mustaqil ushlab turdi.'],
  ['parent', 'Bu ajoyib yangilik. Uyda qaychi berishga qo‘rqamiz.'],
  ['teacher', 'Bolalar qaychisi bilan, faqat siz yonida bo‘lganingizda. Kuniga 5 daqiqa yetarli.'],
  ['parent', 'Yaxshi, shunday qilamiz.'],
  ['teacher', 'Kelasi hafta logoped bilan qo‘shimcha mashg‘ulot rejalashtirdik.'],
  ['parent', 'Qaysi kunlari bo‘ladi?'],
  ['teacher', 'Seshanba va payshanba, soat 10:00 da.'],
  ['parent', 'Kelishdik, o‘sha kunlari erta olib kelamiz.'],
  ['teacher', 'Rahmat. Bugungi kun jurnalini ham to‘ldirdim, ilovadan ko‘rishingiz mumkin.'],
  ['parent', 'Ko‘rdim, juda foydali. Rahmat sizga.'],
];

const ABSENCE_CHAT = [
  ['teacher', '{c} bugun ({d}) kasal deb belgilandi. Ahvoli qanday?'],
  ['parent', 'Kecha kechqurun isitmasi ko‘tarildi, bugun shifokorga bordik.'],
  ['teacher', 'Tuzalib ketsin. Qaytganda mashg‘ulotlarni sekin-asta tiklaymiz.'],
];

const THERAPIES = [
  { t: 'Tinchlantiruvchi musiqa to‘plami', ty: 'music', ct: 'audio', dur: 15, ag: 'preschool', dl: 'beginner', d: 'Sensor ortiqcha yuklanishda tinchlanish uchun 15 daqiqalik audio.' },
  { t: 'Nutq mashqlari: bo‘g‘inlar', ty: 'speech', ct: 'video', dur: 20, ag: 'preschool', dl: 'beginner', d: 'Logoped tayyorlagan bosqichma-bosqich video mashqlar.' },
  { t: 'Mayda motorika: kundalik mashqlar', ty: 'occupational', ct: 'document', dur: 25, ag: 'school_age', dl: 'intermediate', d: 'Uy sharoitida bajariladigan 10 ta mashq to‘plami.' },
  { t: 'Harakat terapiyasi asoslari', ty: 'physical', ct: 'video', dur: 30, ag: 'all', dl: 'beginner', d: 'Yirik motorikani rivojlantiruvchi mashqlar.' },
  { t: 'Rangli terapiya mashg‘ulotlari', ty: 'art', ct: 'image', dur: 20, ag: 'preschool', dl: 'beginner', d: 'Rang va shakl orqali hissiy ifoda mashqlari.' },
];

const RATING_PERIODS = ['Q1-2026', 'Q2-2026', 'Q3-2026'];
const RATING_COMMENT = {
  5: 'Muassasa faoliyati yuqori darajada tashkil etilgan, hujjatlar tartibda.',
  4: 'Umumiy holat qoniqarli. Individual rejalarni yangilash tavsiya etiladi.',
  3: 'Davomat hisobi to‘liq yuritilmoqda, ammo terapiya mashg‘ulotlari yetarli emas.',
  2: 'Bir qator ko‘rsatkichlar bo‘yicha kamchiliklar aniqlandi, choralar talab etiladi.',
};

function rng(seedStr) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) { h ^= seedStr.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (isoStr, n) => { const d = new Date(`${isoStr}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return iso(d); };

/** Multi-row INSERT — one round-trip per chunk. */
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
      `INSERT INTO ${table} (${quoted}) VALUES ${tuples.join(',')} ON CONFLICT DO NOTHING`, params);
    written += res.rowCount;
  }
  return written;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();

  if (ONLY_IDENTIFY) { console.table((await c.query(IDENTIFY_SQL)).rows); await c.end(); return; }

  if (TEARDOWN_SLUG) {
    const sch = await c.query('SELECT id FROM schools WHERE slug=$1 AND id::text LIKE $2', [TEARDOWN_SLUG, `${MARK}%`]);
    if (!sch.rows.length) { console.log('no seeded school with slug', TEARDOWN_SLUG); await c.end(); return; }
    const sidv = sch.rows[0].id;
    const kidIds = (await c.query('SELECT id FROM children WHERE "schoolId"=$1', [sidv])).rows.map((x) => x.id);
    const usrIds = (await c.query('SELECT id FROM users WHERE "schoolId"=$1 AND id::text LIKE $2', [sidv, `${MARK}%`])).rows.map((x) => x.id);
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

  if (DO_PURGE) {
    console.log('── PURGE: prior-run markers ──');
    for (const q of PURGE_SQL) {
      const r = await c.query(q);
      console.log(`  ${r.rowCount} row(s)  ${q.slice(0, 92)}`);
    }
  }

  if (DO_TEARDOWN) {
    console.log('── TEARDOWN (all) ──');
    for (const q of TEARDOWN_SQL) {
      const r = await c.query(q);
      console.log(`  ${r.rowCount} row(s)  ${q.slice(0, 80)}`);
    }
    console.table((await c.query(IDENTIFY_SQL)).rows);
    await c.end();
    return;
  }

  const pwHash = await bcrypt.hash(PASSWORD, 10);
  const summary = [];

  for (const S of SCHOOLS.filter((x) => !ONLY_SLUG || x.slug === ONLY_SLUG)) {
    const r = rng(S.slug);
    const schoolId = sid('school', S.slug);
    const WEEKS = S.weeks;

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

    const dirId = sid('user', S.slug, 'admin');
    await c.query(
      `INSERT INTO users (id,email,password,"firstName","lastName",role,"schoolId",phone,"isActive","isVerified","documentsApproved",status,"mustChangePassword","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,'admin',$6,$7,true,true,true,'active',false,now(),now())
       ON CONFLICT (id) DO UPDATE SET email=EXCLUDED.email, password=EXCLUDED.password,
         "firstName"=EXCLUDED."firstName", "lastName"=EXCLUDED."lastName", "isActive"=true, "updatedAt"=now()`,
      [dirId, `direktor@${S.slug}.uz`, pwHash, S.dir[0], S.dir[1], schoolId, '+998901000001']
    );

    // two receptions per school.
    // i===0 keeps the legacy id key ('reception') so the row that already holds
    // qabul@<slug>.uz is UPDATED in place; a new key would collide on the unique
    // email. Same reason the i===0 document keeps its legacy key below.
    const recIds = [];
    await c.query(`DELETE FROM documents WHERE id=$1`, [sid('doc', S.slug)]); // stale pre-expansion row
    for (let i = 0; i < S.rec.length; i++) {
      const [fn, ln] = S.rec[i];
      const rid = i === 0 ? sid('user', S.slug, 'reception') : sid('user', S.slug, `reception${i}`);
      recIds.push(rid);
      await c.query(
        `INSERT INTO users (id,email,password,"firstName","lastName",role,"schoolId",phone,"isActive","isVerified","documentsApproved",status,"mustChangePassword","createdBy","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5,'reception',$6,$7,true,true,true,'active',false,$8,now(),now())
         ON CONFLICT (id) DO UPDATE SET email=EXCLUDED.email, password=EXCLUDED.password,
           "firstName"=EXCLUDED."firstName", "lastName"=EXCLUDED."lastName", "isActive"=true, "updatedAt"=now()`,
        [rid, `${i === 0 ? 'qabul' : `qabul${i + 1}`}@${S.slug}.uz`, pwHash, fn, ln, schoolId, `+99890100000${2 + i}`, dirId]
      );
      const docId = sid('doc', S.slug, String(i));
      await c.query(
        `INSERT INTO documents (id,"userId","documentType","fileName","filePath","fileSize","mimeType",status,"reviewedBy","reviewedAt","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5,182340,'application/pdf',$6,$7,now() - interval '19 days', now() - interval '21 days', now())
         ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status, "reviewedBy"=EXCLUDED."reviewedBy", "updatedAt"=now()`,
        [docId, rid, i === 0 ? 'certificate' : 'identification',
          `${i === 0 ? 'malaka-guvohnomasi' : 'shaxsni-tasdiqlovchi'}-${S.slug}.pdf`,
          `/uploads/documents/${docId}.pdf`, i === 0 ? 'approved' : 'pending', i === 0 ? dirId : null]
      );
    }
    const recId = recIds[0];

    // teachers (may exceed group count — unassigned specialists are a real case)
    const teachers = [];
    for (let i = 0; i < S.tch.length; i++) {
      const [fn, ln] = S.tch[i];
      const tId = sid('user', S.slug, `teacher${i}`);
      teachers.push({ id: tId, name: `${fn} ${ln}`, groups: [] });
      await c.query(
        `INSERT INTO users (id,email,password,"firstName","lastName",role,"schoolId",phone,"isActive","isVerified","documentsApproved",status,"mustChangePassword","createdBy","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5,'teacher',$6,$7,true,true,true,'active',false,$8,now(),now())
         ON CONFLICT (id) DO UPDATE SET email=EXCLUDED.email, password=EXCLUDED.password,
           "firstName"=EXCLUDED."firstName", "lastName"=EXCLUDED."lastName", "isActive"=true, "updatedAt"=now()`,
        [tId, `tarbiyachi${i + 1}@${S.slug}.uz`, pwHash, fn, ln, schoolId, `+9989010000${10 + i}`, recId]
      );
    }

    // groups
    const groups = [];
    for (let g = 0; g < S.groups.length; g++) {
      const owner = teachers[S.groupTeacher[g]];
      const grpId = sid('group', S.slug, `g${g}`);
      await c.query(
        `INSERT INTO groups (id,name,description,"teacherId",capacity,"ageRange","schoolId","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,now(),now())
         ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, "teacherId"=EXCLUDED."teacherId",
           capacity=EXCLUDED.capacity, "updatedAt"=now()`,
        [grpId, `${GROUP_NAMES[g]} guruhi`, `${GROUP_NAMES[g]} guruhi — kunlik rejim va individual mashg‘ulotlar`,
          owner.id, S.groups[g] + 2, AGE_RANGES[g], schoolId]
      );
      groups.push({ id: grpId, name: `${GROUP_NAMES[g]} guruhi`, teacher: owner });
      owner.groups.push(grpId);
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
        const pFirst = pick(r, GIRL);
        const pId = sid('user', S.slug, `parent${g}-${k}`);
        const cId = sid('child', S.slug, `c${g}-${k}`);
        await c.query(
          `INSERT INTO users (id,email,password,"firstName","lastName",role,"schoolId","groupId","teacherId",phone,"isActive","isVerified","documentsApproved",status,"mustChangePassword","createdBy","privacyConsentedAt","createdAt","updatedAt")
           VALUES ($1,$2,$3,$4,$5,'parent',$6,$7,$8,$9,true,true,true,'active',false,$10,now() - interval '25 days',now(),now())
           ON CONFLICT (id) DO UPDATE SET email=EXCLUDED.email, password=EXCLUDED.password,
             "firstName"=EXCLUDED."firstName", "lastName"=EXCLUDED."lastName",
             "groupId"=EXCLUDED."groupId", "teacherId"=EXCLUDED."teacherId",
             "privacyConsentedAt"=EXCLUDED."privacyConsentedAt", "isActive"=true, "updatedAt"=now()`,
          [pId, `otaona${g + 1}${k + 1}@${S.slug}.uz`, pwHash, pFirst, F(sur), schoolId,
            groups[g].id, groups[g].teacher.id, `+9989${String(10000000 + Math.floor(r() * 89999999)).slice(0, 8)}`, recId]
        );
        await c.query(
          `INSERT INTO children (id,"parentId","firstName","lastName","dateOfBirth",gender,"disabilityType","specialNeeds",class,teacher,"schoolId","groupId","medicalDiagnosis","institutionStartDate","emergencyContact","contactPhone",address,"childDescription","createdAt","updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,now(),now())
           ON CONFLICT (id) DO UPDATE SET "firstName"=EXCLUDED."firstName", "lastName"=EXCLUDED."lastName",
             "dateOfBirth"=EXCLUDED."dateOfBirth", "disabilityType"=EXCLUDED."disabilityType",
             "specialNeeds"=EXCLUDED."specialNeeds", "groupId"=EXCLUDED."groupId",
             teacher=EXCLUDED.teacher, "updatedAt"=now()`,
          [cId, pId, first, last, dob, male ? 'Male' : 'Female', dg.d, dg.need,
            GROUP_NAMES[g], groups[g].teacher.name, schoolId, groups[g].id, dg.m,
            addDays(TODAY, -(200 + Math.floor(r() * 500))),
            JSON.stringify({ name: `${pFirst} ${F(sur)}`, phone: '+998901234567', relation: 'Ona' }),
            `+9989${String(10000000 + Math.floor(r() * 89999999)).slice(0, 8)}`,
            `${S.city} shahri, ${pick(r, ['Bog‘bon', 'Chinor', 'Navro‘z', 'Guliston'])} ko‘chasi ${1 + Math.floor(r() * 60)}-uy`,
            `${first} ${dg.d.toLowerCase()} tashxisi bilan kuzatilmoqda. ${dg.need}.`]
        );
        children.push({ id: cId, first, last, gid: groups[g].id, tid: groups[g].teacher.id, tname: groups[g].teacher.name, pid: pId, g, dg });
        idx++;
      }
    }

    // ── day-grained history ────────────────────────────────────────────────
    await c.query('DELETE FROM child_attendance WHERE "schoolId"=$1', [schoolId]);
    const childIds = children.map((x) => x.id);
    await c.query('DELETE FROM meals WHERE "childId" = ANY($1)', [childIds]);
    await c.query('DELETE FROM activities WHERE "childId" = ANY($1)', [childIds]);
    await c.query('DELETE FROM child_journal_entries WHERE "schoolId"=$1', [schoolId]);
    await c.query('DELETE FROM chat_messages WHERE "senderId" = ANY($1)',
      [[...children.map((x) => x.pid), ...teachers.map((t) => t.id)]]);

    const absencePlan = new Map();
    for (const ch of children) {
      const runs = r() < 0.55 ? 1 : (r() < 0.8 ? 2 : 0);
      for (let n = 0; n < runs * (WEEKS > 6 ? 3 : 1); n++) {
        const start = 1 + Math.floor(r() * (WEEKS * 7 - 5));
        const len = 2 + Math.floor(r() * 3);
        const kind = r() < 0.6 ? 'sick' : (r() < 0.5 ? 'home_leave' : 'absent');
        for (let d = 0; d < len; d++) absencePlan.set(`${ch.id}|${addDays(TODAY, -(start + d))}`, kind);
      }
    }

    let attRows = 0; let presentRows = 0;
    const attBuf = []; const mealBuf = []; const actBuf = []; const jrnBuf = [];
    for (let back = WEEKS * 7 - 1; back >= 0; back--) {
      const day = addDays(TODAY, -back);
      const dow = new Date(`${day}T12:00:00Z`).getUTCDay();
      if (dow === 0 || dow === 6) continue;
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
        for (const ch of children.slice(0, 3)) {
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

    // chat — long threads for ordering/scrollback, plus one absence conversation
    const chatBuf = [];
    for (const ch of children.slice(0, S.volume ? 3 : 2)) {
      LONG_CHAT.forEach(([role, tpl], n) => {
        const back = Math.max(2, 22 - n);
        chatBuf.push([sid('chat', ch.id, String(n)), `parent:${ch.pid}`,
          role === 'teacher' ? ch.tid : ch.pid, role, tpl.replace('{c}', ch.first),
          true, true, `${addDays(TODAY, -back)}T${String(8 + (n % 9)).padStart(2, '0')}:${String(10 + n).padStart(2, '0')}:00Z`,
          `${addDays(TODAY, -back)}T${String(8 + (n % 9)).padStart(2, '0')}:${String(10 + n).padStart(2, '0')}:00Z`]);
      });
    }
    {
      const absKey = [...absencePlan.keys()][0];
      if (absKey) {
        const [absChildId, absDay] = absKey.split('|');
        const ch = children.find((x) => x.id === absChildId);
        if (ch) {
          ABSENCE_CHAT.forEach(([role, tpl], n) => {
            chatBuf.push([sid('chatabs', ch.id, String(n)), `parent:${ch.pid}`,
              role === 'teacher' ? ch.tid : ch.pid, role,
              tpl.replace('{c}', ch.first).replace('{d}', absDay), true, role === 'teacher',
              `${absDay}T${String(9 + n).padStart(2, '0')}:20:00Z`, `${absDay}T${String(9 + n).padStart(2, '0')}:20:00Z`]);
          });
        }
      }
    }
    await bulk(c, 'chat_messages', ['id', 'conversationId', 'senderId', 'senderRole', 'content', 'readByParent', 'readByTeacher', 'createdAt', 'updatedAt'], chatBuf);

    // therapies + usages
    for (let i = 0; i < THERAPIES.length; i++) {
      const th = THERAPIES[i];
      const thId = sid('therapy', S.slug, String(i));
      await c.query(
        `INSERT INTO therapies (id,title,description,"therapyType","contentType",duration,"ageGroup","difficultyLevel",tags,"createdBy","isActive","usageCount",rating,"ratingCount","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,$11,$12,$13,now(),now())
         ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, description=EXCLUDED.description, "updatedAt"=now()`,
        [thId, th.t, th.d, th.ty, th.ct, th.dur, th.ag, th.dl, ['maxsus ta’lim', th.ty],
          teachers[0].id, 3 + Math.floor(r() * 12), (3.5 + r() * 1.4).toFixed(1), 2 + Math.floor(r() * 8)]
      );
      await c.query('DELETE FROM therapy_usages WHERE "therapyId"=$1', [thId]);
      const tuBuf = [];
      for (const ch of children.slice(0, S.volume ? 12 : 4)) {
        if (r() < 0.45) continue;
        const day = addDays(TODAY, -(2 + Math.floor(r() * 18)));
        tuBuf.push([sid('tu', thId, ch.id), thId, ch.id, ch.tid, `${day}T10:00:00Z`,
          `${day}T10:${String(th.dur).padStart(2, '0')}:00Z`, th.dur, 40 + Math.floor(r() * 55),
          pick(r, ['Yaxshi qabul qildi.', 'Boshida qiynaldi, keyin moslashdi.', 'Takrorlash tavsiya etiladi.']),
          3 + Math.floor(r() * 3), `${day}T10:00:00Z`, `${day}T10:00:00Z`]);
      }
      await bulk(c, 'therapy_usages', ['id', 'therapyId', 'childId', 'teacherId', 'startTime', 'endTime', 'duration', 'progress', 'notes', 'rating', 'createdAt', 'updatedAt'], tuBuf);
    }

    // IRRs
    for (const ch of children.slice(0, S.volume ? 10 : 3)) {
      await c.query(
        `INSERT INTO irrs (id,"childId","schoolId","parentId","createdBy",status,"childFullName","dateOfBirth","ageAtAssessmentStart","ptpkIntakeDate","ptpkConclusionDate","ptpkConclusionNumber","ptpkDiagnosis","irrStartDate","additionalInfo","childStrengths","riskFactors","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5,'active',$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,now(),now())
         ON CONFLICT (id) DO UPDATE SET status='active', "ptpkDiagnosis"=EXCLUDED."ptpkDiagnosis", "updatedAt"=now()`,
        [sid('irr', ch.id), ch.id, schoolId, ch.pid, ch.tid, `${ch.last} ${ch.first}`,
          addDays(TODAY, -(4 * 365)), `${4 + Math.floor(r() * 5)} yosh ${Math.floor(r() * 11)} oy`,
          addDays(TODAY, -180), addDays(TODAY, -160), `PKT-${String(100 + Math.floor(r() * 800))}`,
          `${ch.dg.m} — ${ch.dg.d}`, addDays(TODAY, -150),
          'Reja choraklik monitoring asosida qayta ko‘rib chiqiladi.',
          pick(r, ['Rasm chizishni yaxshi ko‘radi, ranglarni ajratadi.', 'Musiqaga sezgir, ritmni takrorlaydi.', 'Kattalar bilan ko‘z aloqasini o‘rnatadi.', 'Kundalik tartibni yaxshi eslab qoladi.']),
          pick(r, ['Shovqinli muhitda tez charchaydi.', 'Ovqatlanishda tanlab yeydi.', 'Tartib buzilganda bezovtalanadi.'])]
      );
    }

    // government ratings — three periods, varying stars
    const govEmail = { [R_TOSHKENT]: 'gov.toshkent@uchqun.uz', [R_SAMARQAND]: 'gov.samarqand@uchqun.uz', [R_ANDIJON]: 'gov.republic@uchqun.uz' }[S.region];
    const gu = await c.query('SELECT id FROM users WHERE email=$1', [govEmail]);
    const baseStars = { tmm3: 4, tmm4: 5, smm3: 3, smm4: 4, smm5: 3, amm1: 2 }[S.slug];
    if (gu.rows.length) {
      // idx_gov_school_ratings_unique_active is a partial unique index on
      // (schoolId, period) — an ON CONFLICT (id) upsert does not catch it, so a
      // pre-expansion row under a different id collides. Clear the seed's own
      // rows for this school first.
      await c.query(`DELETE FROM government_school_ratings WHERE "schoolId"=$1 AND id::text LIKE $2`, [schoolId, `${MARK}%`]);
      for (let p = 0; p < RATING_PERIODS.length; p++) {
        const stars = Math.max(2, Math.min(5, baseStars - 1 + p));
        await c.query(
          `INSERT INTO government_school_ratings (id,"schoolId","govUserId",period,stars,indicators,comment,"createdAt","updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7, now() - ($8 || ' days')::interval, now() - ($8 || ' days')::interval)
           ON CONFLICT (id) DO UPDATE SET stars=EXCLUDED.stars, indicators=EXCLUDED.indicators,
             comment=EXCLUDED.comment, "updatedAt"=now()`,
          [sid('govrate', S.slug, RATING_PERIODS[p]), schoolId, gu.rows[0].id, RATING_PERIODS[p], stars,
            JSON.stringify({
              gov_indicator_1: stars, gov_indicator_2: Math.max(2, stars - 1),
              gov_indicator_3: stars, gov_indicator_4: Math.min(5, stars + 1), gov_indicator_5: stars,
            }),
            RATING_COMMENT[stars] || RATING_COMMENT[3], String(200 - p * 70)]
        );
      }
    }

    // audit log — school-lifecycle rows (the only ones the government page shows)
    // plus school-scoped operational rows for the admin activity feed.
    await c.query('DELETE FROM audit_log WHERE "schoolId"=$1', [schoolId]);
    const auditBuf = [];
    const govActor = gu.rows[0]?.id ?? null;
    const LIFECYCLE = ['change_category', 'archive', 'reactivate'];
    const lifecycleCount = S.volume ? 48 : 6;
    for (let i = 0; i < lifecycleCount; i++) {
      auditBuf.push([govActor, 'government', LIFECYCLE[i % 3], 'schools', schoolId, schoolId,
        JSON.stringify({ school: S.slug, note: 'davriy nazorat' }),
        new Date(Date.now() - (i * 36 + 12) * 3600 * 1000).toISOString()]);
    }
    const OPS = [
      ['create', 'receptions', recId, dirId, 'admin', 21],
      ['approve', 'documents', sid('doc', S.slug, '0'), dirId, 'admin', 19],
      ['create', 'teachers', teachers[0].id, recId, 'reception', 18],
      ['create', 'parents', children[0].pid, recId, 'reception', 16],
      ['bulk_import', 'children', children[1].id, recId, 'reception', 15],
      ['update', 'groups', groups[0].id, dirId, 'admin', 9],
      ['create', 'irr', children[0].id, teachers[0].id, 'teacher', 6],
    ];
    for (const [action, entity, entityId, actorId, actorRole, back] of OPS) {
      auditBuf.push([actorId, actorRole, action, entity, entityId, schoolId,
        JSON.stringify({ school: S.slug }), new Date(Date.now() - back * 86400 * 1000).toISOString()]);
    }
    await bulk(c, 'audit_log', ['actorId', 'actorRole', 'action', 'entity', 'entityId', 'schoolId', 'meta', 'occurredAt'], auditBuf);

    const pct = attRows ? Math.round((presentRows / attRows) * 100) : 0;
    summary.push({
      slug: S.slug, region: { [R_TOSHKENT]: 'Toshkent', [R_SAMARQAND]: 'Samarqand', [R_ANDIJON]: 'Andijon' }[S.region],
      groups: S.groups.length, children: children.length, teachers: teachers.length,
      receptions: S.rec.length, weeks: WEEKS, attendanceRows: attRows, presentPct: pct,
    });
    console.log(`  ${S.slug}: ${children.length} children, ${teachers.length} teachers, ${S.groups.length} groups, ${WEEKS}w, ${attRows} attendance rows, ${pct}% present`);
  }

  console.log('\n── SUMMARY ──');
  console.table(summary);
  console.log('── IDENTIFY ──');
  console.table((await c.query(IDENTIFY_SQL)).rows);
  await c.end();
}

main().catch((e) => { console.error('SEED FAILED:', e.message, e.stack); process.exit(1); });
