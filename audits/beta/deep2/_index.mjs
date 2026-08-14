import { phase, writeIndex } from './lib.mjs';
const P = process.argv[2] || 'P2';
const r = writeIndex(phase(P));
console.log(P, 'indexed', r.indexed, 'files', r.files, 'orphans', r.orphans.length);
