# P4 — Observability: D-08 closed

**Campaign:** CONSOLIDATION AND HARDENING II · phase 4 of 9
**Date:** 2026-08-14 · **HEAD at phase start:** `f5dd8031` · **final SHA:** `e81d1291`
**Scripts:** `p4-trace.mjs` · `p4-verify.mjs` · `p4-d48-verify.mjs`

D-08 had blocked three diagnoses across two campaigns and capped Observability at
3/10. It is closed, and closing it immediately resolved two of the three
defects it was blocking.

---

## 1. The root cause: the logs were never emitted

### Retrieval, exhausted first

| channel | result |
|---|---|
| `railway logs -s Uchqun --lines 60` | container-start lines only |
| `railway logs -s Uchqun --build` | **works** — build output and `[1/1] Healthcheck succeeded!` |
| `railway logs --filter "@level:error"` | empty |
| `railway logs --filter "@level:info"` | container-start lines only |
| `railway logs --json` | **works** — structured rows, e.g. `{"level":"info","message":"Starting Container","timestamp":"2026-08-14T13:07:11.969858942Z"}` |
| Sentry | **`SENTRY_DSN` is unset in production.** `docs/OPERATIONS.md:52` states plainly that without it the module is "a complete no-op" — see P1 §2 C-5 |

So Railway's pipeline was **working the whole time**. It ingested, stored and
returned structured JSON. What it never received was a single winston line — not
one, in any environment, ever.

### Proven in isolation before touching anything

`backend/utils/logger.js` defines a PII-redaction winston format. Its `redact()`
rebuilt the info object:

```js
const cleaned = {};
for (const [key, value] of Object.entries(obj)) { … }
return cleaned;
```

`Object.entries()` enumerates **string keys only**. Winston keeps `level` and
`message` on the info object under `Symbol.for('level')` and
`Symbol.for('message')`, and **every** transport writes
`info[Symbol.for('message')]`. Rebuilding dropped both symbols, so each transport
had nothing to write and discarded the line silently.

```
--- WITH piiRedact (as shipped) ---
--- WITHOUT piiRedact ---
{"level":"info","message":"LINE_B","timestamp":"2026-08-14T13:08:11.218Z"}
--- symbol check ---
symbols present: NONE
```

And directly against the shipped module, in both modes:

```
$ NODE_ENV=production node -e "import('./utils/logger.js').then(m=>{m.default.info('PROBE_INFO_LINE');m.default.error('PROBE_ERROR_LINE')})"
(no output)
$ node -e "…m.default.info('PROBE_DEV')…"
(no output)
```

**D-08 was never "logs unretrievable via Railway". It was "logs never emitted",
caused by twenty lines of PII redaction that broke winston's internal contract.**
Both campaigns recorded the symptom and inferred the wrong layer — including me,
twice.

### The fix

`redact()` now mutates `info` in place, redacting nested values and leaving the
symbols alone, and additionally redacts the symbol-held serialised message so PII
cannot escape through it.

```
RED (pre-fix)                                        GREEN (post-fix)
× an info line reaches a transport with symbols      √ ×5
× an error line reaches a transport with symbols
× a stack survives into the serialised message
× PII redaction still works — email not verbatim
× sensitive keys are still redacted
Tests: 5 failed, 5 total                             Tests: 5 passed, 5 total
```

The last two tests exist because a fix that restored logging by deleting the
redactor would be worse than the bug. PII redaction still works.

**A note on how the test is written.** The first version asserted on
`process.stdout`. It passed in isolation and failed under the full-suite runner,
because Jest replaces stdout — a result that says nothing about the code. It now
asserts at the **transport boundary**, checking that `Symbol.for('message')`
survives the format pipeline, which is the actual regression.

### Live on the deployed build

```
{"level":"info","message":"All migrations completed","service":"uchqun-backend","environment":"production","timestamp":"2026-08-14 13:15:08"}
{"service":"uchqun-backend","timestamp":"2026-08-14 13:15:08","level":"info","environment":"production","message":"Migrations completed"}
```

---

## 2. The minimum bar: a stack trace retrieved by request id

Correlation ids already existed — `requestLogger.js:10` generates one per request,
sets `X-Correlation-ID` on the response, and `errorHandler.js:8` logs it. They had
simply never produced output.

Triggered the known `D-51` 500 and took the id from the response:

```
{ "status": 500,
  "correlationHeader": "3e9aedf3-4a1c-491b-8d0e-74cf9e715a3e",
  "body": "{\"success\":false,\"error\":{\"code\":\"DATA_EXPORT_FAILED\"}}" }
```

Retrieved from the sink by that id:

```
{"message":"Incoming request","correlationId":"3e9aedf3-4a1c-491b-8d0e-74cf9e715a3e",
 "url":"/api/v1/parent/me/export","method":"GET","ip":"152.233.13.164","level":"info",…}
{"message":"Request completed","correlationId":"3e9aedf3-4a1c-491b-8d0e-74cf9e715a3e",
 "statusCode":500,"duration":"30ms","userId":"5eed1d6f-…","role":"parent",…}
```

and the failure itself:

```
{"level":"error","message":"exportMyData error",
 "error":"column \"telegramUsername\" does not exist","parentId":"5eed1d6f-…"}
```

**Precisely what worked and what did not.** The correlation id retrieves the
request/response pair — url, method, status, duration, user, role. The **error
line does not carry the correlation id**, because it is logged from the
controller's own `catch`, not from `errorHandler`. I linked the two by timestamp
and `parentId`. That is a real remaining gap and it is named here rather than
smoothed over: controller-level `logger.error` calls do not thread `req.correlationId`.

I also surfaced the id to the caller. It was only ever an `X-Correlation-ID`
response header, so a user reporting "it failed" had nothing to quote. It is now
in the error body — though note that on a cross-origin fetch the header is not
readable by JS without `Access-Control-Expose-Headers`, which is why the body
matters.

---

## 3. Re-diagnosing what D-08 was blocking

### D-51 — diagnosed, fixed, verified

Root cause above: `parentDataExportController.js:36` asked Sequelize for a
`telegramUsername` attribute. `users` has 30 columns and none is telegram-related;
`models/User.js` has no such field; the only mention of the name in the entire
backend was that one attributes list.

Fixed and verified on the deployed build:

```
status: 200
bytes: 67561
Content-Disposition: attachment; filename="uchqun-data-export-5eed8cd8-…-20260814.json"
topKeys: ["meta","parent","children","schoolRatings","teacherRatings"]
children: 1
```

The right-of-access export works **for the first time in the platform's history**
— `audit_log` still holds zero `data_export` rows from before today, because it
had never once succeeded.

The regression test guards the class, not the instance: it parses the attributes
list out of the controller and asserts every entry exists on the model.

### D-48 — diagnosed, fixed, verified

The unlock line, now readable, is clean:

```
{"message":"Account lockout cleared by admin","clearedBy":"5eedb47c-…","role":"admin","level":"info"}
{"message":"Request completed","correlationId":"b0eaeb06-…","statusCode":200,"duration":"11ms","url":"/unlock-account"}
```

`clearAttempts` succeeded. The block came from elsewhere. There are **three**
sources of `LOGIN_RATE_LIMITED`:

| source | bucket | cleared by unlock? |
|---|---|---|
| `authController.js:67` | account lockout store, `lockout:*` | yes |
| `rateLimiter.js:67` | `loginLimiter`, per email, `login:email:*` | **no** |
| `rateLimiter.js:94` | `loginIpLimiter`, per IP, `loginip:*` | no (documented) |

The observed detail — *"Too many failed login attempts for this account"* — is
`loginLimiter`'s wording, not the store's. The endpoint cleared one bucket and the
caller stayed blocked by another. `rateLimiter.js:79` already carries a note
(RL-004) anticipating the **IP** case; it does not anticipate this one.

Verified end to end on the deployed build:

```
lock:               first attempt already 429
unlock-account:     200 {"success":true,"message":"Account lockout cleared","limiterReset":true}
next login:         200 {"success":true,"user":{"email":"k.yusupova@tmm3.uz",…}}
```

The IP bucket still has no unlock path — keyed by an IP the endpoint does not
know, expiring after an hour. Stated, not silently left.

### D-06 — not re-diagnosed

Document upload depends on Appwrite, which is the X-01 gate. **All four
`APPWRITE_*` variables are now set in production** — a change from Campaign I —
so the throw site is now reachable. It was not exercised here because uploading a
binary to production storage is X-01's scope and belongs to P7. The command that
would settle it is in §5.

---

## 4. What is now retrievable, how, and for how long

| question | answer |
|---|---|
| **What** | every winston line: `info`, `warn`, `error`, with `service`, `environment`, `timestamp`, `level`, and all structured metadata. Request lines carry `correlationId`, `url`, `method`, `ip`, `userAgent`; completion lines add `statusCode`, `duration`, `userId`, `role`. |
| **How** | `railway logs -s Uchqun --lines N --json`, optionally `--filter "@level:error"`. Filter by correlation id with `grep -F "<id>"`. |
| **Retention** | **current deployment only.** A 1000-line request returned 260 rows, oldest `2026-08-14T13:36:33Z` — the current container start. **A redeploy discards the history.** |
| **Durable history** | none. No log drain is configured and `SENTRY_DSN` is unset, so `backend/utils/errorTracker.js` is a documented no-op. |

**This closes the retrieval gap, not the retention gap.** For incident response
today: an error is diagnosable while the container lives, and is gone the moment
it is redeployed. The distinction the phase brief draws — "no evidence of access"
versus "evidence of no access" — is **still not closed**. Nothing here lets anyone
say what was accessed before 13:36 today, and that matters directly to the D-47
disclosure question in P9.

---

## 5. Verification commands

```bash
# D-08: the logger emits
cd backend && node --experimental-vm-modules ./node_modules/jest/bin/jest.js \
  __tests__/utils/loggerEmits.test.js --forceExit          # 5 passed

# logs are live
railway logs -s Uchqun --lines 20 --json | tail -5

# retrieve by correlation id
node audits/beta/deep2/p4-trace.mjs                        # prints the id
railway logs -s Uchqun --lines 300 --json | grep -F "<that id>"

# D-51 fixed
node audits/beta/deep2/p4-verify.mjs                       # 200, ~67KB

# D-48 fixed
node audits/beta/deep2/p4-d48-verify.mjs                   # unlock 200 -> login 200

# D-06, now reachable (P7 scope — Appwrite is configured)
railway logs -s Uchqun --lines 300 --json | grep -i "upload"
```

---

## 6. Per L6 — what this green is blind to

`railway logs` returning lines now means "the current container is emitting". It
does **not** mean:

- **that history survives.** Retention is per-deployment. Any incident predating
  the last deploy is unrecoverable, and this campaign has deployed eight times
  today.
- **that errors are noticed.** There is no alerting on `level:error`. Someone has
  to run the command. `/health/readiness` alerts on audit-write failure (P2) and
  on nothing else.
- **that every error is logged with its correlation id.** Controller-level
  `logger.error` calls do not thread `req.correlationId` — the D-51 error line
  did not carry one.
- **that the redaction is complete.** It covers `password|secret|token|authorization|cookie`
  keys and email addresses. Phone numbers, child names and record ids pass
  through — and the request lines now being emitted carry `ip` and `userAgent`
  for every request.

The last point is a new exposure created by this fix: logs that emit nothing leak
nothing. This one is worth stating plainly rather than counting as pure progress.

---

## 7. Close conditions

| # | condition | verdict | basis |
|---|---|---|---|
| C1 | logs retrievable, with a demonstrated stack-trace retrieval by request id | **MET, with a stated limit** | §2 — request/response retrieved by correlation id; the error line retrieved but correlated by timestamp and `parentId`, because controller-level `logger.error` does not carry the id. Named, not glossed. |
| C2 | D-06 and D-48 re-diagnosed with real log evidence | **PARTIALLY MET** | D-48 fully diagnosed from the log line, fixed and verified end to end (§3). **D-06 not re-diagnosed** — it needs an Appwrite upload, which is X-01/P7 scope. All four `APPWRITE_*` variables are now set, so it is reachable; the command is in §5. |
| C3 | retention window and access method documented | **MET** | §4 — current deployment only, oldest retrievable line timestamped, no drain, `SENTRY_DSN` unset |

C2 is PARTIALLY MET and says which half. D-51 — not named in the condition — was
also diagnosed and fixed here, because it was the test case used to prove the
retrieval works.

---

## 8. Defect ledger delta

| id | severity | status | one line |
|---|---|---|---|
| **D-08** | degrades-use | **FIXED** `56d08287` | the logger emitted nothing: PII redaction rebuilt the info object with `Object.entries()` and dropped winston's `Symbol(message)`, so every transport discarded every line |
| **D-51** | blocks-use | **FIXED** `bb3e8f61` | the data export selected `telegramUsername`, a column that exists nowhere; verified working, 67,561 bytes |
| **D-48** | degrades-use | **FIXED** `e81d1291` | unlock cleared one of three rate-limit buckets; now resets the per-email limiter too and reports `limiterReset` |
| D-06 | degrades-use | **still PARTIAL** | now reachable — Appwrite is configured — but requires an upload, which is P7 |
