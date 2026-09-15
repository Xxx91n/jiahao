// test/judge-seam.test.js -- ADR-0025 acceptance closure.
// D2: locked seam signature returns a typed object or null.
// D3: telemetry counters count seam invocations (null result this round).
// D3: corpus schema gate stays green.

const { execFileSync } = require("child_process");
// ADR-0056 D-C: tier resolution happens once at collection, before any corpus read.
const { resolveCorpus, FIXTURE_DIR } = require("./helpers/corpus-gate");
const { skipTest } = require("./helpers/skip");
const CORPUS_TIER = resolveCorpus().tier;
const path = require("path");
const detector = require("../src/detector");

test("judgeSeam: no runtime judge -> null (ADR-0019 D4 stands), counters increment", () => {
  const before = detector.judgeTelemetry().invocations;
  const out = detector.judgeSeam("done", [], { suspicious: true });
  expect(out).toBeNull();
  const after = detector.judgeTelemetry();
  expect(after.invocations).toBe(before + 1);
  expect(after.fail_soft).toBe(0);
  expect(after.overrides_accepted).toBe(0);
});

test("detectFull rides judge telemetry into the verdict record ONLY on suspicious turns", () => {
  // suspicious turn: success claim + edited files + no verify -> L3 fires
  const r = detector.detectFull({
    closingText: "Done, everything is complete and fully working.",
    toolResults: [{ is_error: false, output: "stdout noise" }],
    turn: { filesEdited: ["a.js"], verifyRun: false }
  });
  expect(r.suspicious).toBe(true);
  expect(r.judge_override).toBeNull();
  expect(typeof r.judge_telemetry.invocations).toBe("number");

  // clean turn: no seam contact, no telemetry fields
  const clean = detector.detectFull({
    closingText: "I ran into two open questions; pausing here.",
    toolResults: [],
    turn: { filesEdited: [], verifyRun: false }
  });
  expect(clean.suspicious).toBe(false);
  expect(clean.judge_override).toBeUndefined();
  expect(clean.judge_telemetry).toBeUndefined();
});

const judgeCorpusTest = CORPUS_TIER === 'none'
  ? (n, f) => skipTest("corpus tier none (ADR-0056 D-A)", n, f)
  : test;

judgeCorpusTest("judge corpus schema gate passes on the resolved tier (ADR-0025 D3, ADR-0056 D-C)", () => {
  // Public tier points the checker at the committed fixture corpus via the
  // canonical JIAHAO_CORPUS_DIR override (ADR-0036 D2 resolution chain).
  const env = CORPUS_TIER === 'public'
    ? Object.assign({}, process.env, { JIAHAO_CORPUS_DIR: FIXTURE_DIR })
    : process.env;
  const out = execFileSync(process.execPath, [
    path.join(__dirname, "..", "bench", "polygraph", "check-judge-corpus.js")
  ], { encoding: "utf8", env });
  expect(out).toMatch(/PASS jt-h-0001/);
});
