#!/usr/bin/env node
/**
 * Canonical schema dumper — Campaign III P2.
 *
 * Runs backend/scripts/schema-dump.sql against a database and writes one
 * sortable line per schema object. The SQL file is the single source for both
 * sides of the comparison, so production and migrate-fresh cannot drift in
 * FORMAT — only in content, which is the thing being measured.
 *
 * Connection, in order of precedence:
 *   --url <conn>          explicit
 *   DATABASE_URL          environment (this is what CI uses)
 *   DB_HOST/DB_PORT/...   discrete vars (what the app uses)
 *   --from-mcp-config     read the postgres-uchqun MCP server's connection
 *                         string out of ~/.claude.json
 *
 * --from-mcp-config exists so the production credential is never passed through
 * a shell argument, a command substitution, or a log line. The script reads it
 * itself and it is never printed. It is a local convenience only; CI uses
 * DATABASE_URL against its own throwaway database.
 *
 * Usage:
 *   node backend/scripts/schema-dump.mjs --out backend/schema/production-schema.txt --from-mcp-config
 *   node backend/scripts/schema-dump.mjs --out /tmp/fresh-schema.txt
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import pg from 'pg';

const argv = process.argv.slice(2);
const arg = (name) => {
  const i = argv.indexOf(name);
  return i === -1 ? null : argv[i + 1];
};

const SQL_PATH = path.resolve('backend/scripts/schema-dump.sql');
const OUT = arg('--out') ?? '/tmp/schema-dump.txt';

function connectionString() {
  const explicit = arg('--url');
  if (explicit) return explicit;

  if (argv.includes('--from-mcp-config')) {
    const cfg = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.claude.json'), 'utf8'));
    let server = null;
    const walk = (node) => {
      if (!node || typeof node !== 'object') return;
      for (const key of Object.keys(node)) {
        if (key === 'postgres-uchqun') { server = node[key]; return; }
        walk(node[key]);
      }
    };
    walk(cfg);
    if (!server) throw new Error('postgres-uchqun not found in ~/.claude.json');
    const found = (server.args ?? []).find((a) => /^postgres(ql)?:\/\//.test(String(a)));
    if (!found) throw new Error('no connection string in the postgres-uchqun args');
    return found;
  }

  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const { DB_HOST, DB_PORT = '5432', DB_NAME, DB_USER, DB_PASSWORD } = process.env;
  if (DB_HOST && DB_NAME && DB_USER) {
    const auth = DB_PASSWORD ? `${DB_USER}:${DB_PASSWORD}` : DB_USER;
    return `postgresql://${auth}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
  }
  throw new Error('no connection: pass --url, --from-mcp-config, or set DATABASE_URL / DB_*');
}

const sql = fs.readFileSync(SQL_PATH, 'utf8');
const conn = connectionString();
const needsSsl = /rlwy\.net|railway|amazonaws|render\.com/.test(conn);

const client = new pg.Client({
  connectionString: conn,
  ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
});

await client.connect();
const { rows } = await client.query(sql);
await client.end();

const lines = rows.map((r) => r.line);
fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
fs.writeFileSync(OUT, lines.join('\n') + '\n', 'utf8');

// The host is printed; the credential never is.
const host = (conn.match(/@([^/]+)\//) ?? [null, 'unknown'])[1];
console.log(`schema-dump: ${lines.length} objects from ${host} -> ${OUT}`);
const counts = {};
for (const l of lines) { const k = l.slice(0, 3); counts[k] = (counts[k] || 0) + 1; }
console.log('  ' + Object.entries(counts).map(([k, v]) => `${k}=${v}`).join('  '));
