import { phase, writeIndex } from './lib.mjs';
const r = writeIndex(phase('P3'));
console.log('indexed', r.indexed, 'files', r.files, 'orphans', r.orphans.length);
if (r.orphans.length) console.log(r.orphans.slice(0, 20).join('\n'));
