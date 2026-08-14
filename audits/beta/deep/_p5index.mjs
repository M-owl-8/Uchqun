import { phase, writeIndex } from './lib.mjs';
const r = writeIndex(phase('P5'));
console.log('indexed', r.indexed, 'files', r.files, 'orphans', r.orphans.length);
