// D-08 root cause — the logger emitted nothing at all.
//
// Two campaigns recorded D-08 as "backend application logs unretrievable via
// Railway", and it blocked the diagnosis of D-06, D-48 and D-51. The logs were
// not lost in transit. They were never emitted.
//
// backend/utils/logger.js defines a PII-redaction format whose redact() rebuilt
// the info object with Object.entries(). That enumerates string keys only, so
// winston's Symbol(level) and Symbol(message) were dropped. Every transport
// writes info[Symbol.for('message')] — which no longer existed — so every line
// was silently discarded, in every environment, for the platform's whole life.
//
// Proven in isolation before the fix:
//   WITH piiRedact    -> no output
//   WITHOUT piiRedact -> {"level":"info","message":"LINE_B",...}
//   Object.getOwnPropertySymbols(info) after piiRedact -> NONE
//
// This asserts at the TRANSPORT boundary rather than on process.stdout, because
// Jest replaces stdout in a full-suite run and an stdout-based assertion passes
// in isolation and fails under the runner — which says nothing about the code.
//
// FAIL-FIRST: fails against the pre-fix logger.

import winston from 'winston';
import Transport from 'winston-transport';

// Rebuild the shipped format pipeline exactly as backend/utils/logger.js does,
// importing the real module so the test tracks the real implementation.
const loggerModule = await import('../../utils/logger.js');
const logger = loggerModule.default;

class Capture extends Transport {
  constructor(sink) { super({}); this.sink = sink; }
  log(info, next) { this.sink.push(info); next(); }
}

const MESSAGE = Symbol.for('message');
const LEVEL = Symbol.for('level');

const captured = [];
beforeAll(() => { logger.add(new Capture(captured)); });
beforeEach(() => { captured.length = 0; });

describe('D-08 — the logger must actually emit', () => {
  test('an info line reaches a transport with its winston symbols intact', () => {
    logger.info('D08_PROBE_INFO', { probe: 'yes' });
    expect(captured.length).toBeGreaterThan(0);
    const info = captured.at(-1);
    expect(info[LEVEL]).toBe('info');
    expect(typeof info[MESSAGE]).toBe('string');
    expect(info[MESSAGE]).toContain('D08_PROBE_INFO');
  });

  test('an error line reaches a transport with its symbols intact', () => {
    logger.error('D08_PROBE_ERROR', { code: 'X' });
    const info = captured.at(-1);
    expect(info[LEVEL]).toBe('error');
    expect(info[MESSAGE]).toContain('D08_PROBE_ERROR');
  });

  test('a stack survives into the serialised message', () => {
    logger.error('D08_PROBE_STACK', { stack: 'at somewhere:1:1' });
    expect(captured.at(-1)[MESSAGE]).toContain('somewhere');
  });

  test('PII redaction still works — an email is not emitted verbatim', () => {
    logger.info('D08_PROBE_PII', { who: 'someone@example.com' });
    const msg = captured.at(-1)[MESSAGE];
    expect(msg).toContain('D08_PROBE_PII');
    expect(msg).not.toContain('someone@example.com');
    expect(msg).toContain('REDACTED');
  });

  test('sensitive keys are still redacted', () => {
    logger.info('D08_PROBE_SECRET', { password: 'hunter2', token: 'abc' });
    const msg = captured.at(-1)[MESSAGE];
    expect(msg).not.toContain('hunter2');
    expect(msg).toContain('REDACTED');
  });
});
