import { phase, writeIndex } from './lib.mjs';
const r = writeIndex(phase('P7'));
console.log('indexed', r.indexed, 'files', r.files, 'orphans', r.orphans.length);
