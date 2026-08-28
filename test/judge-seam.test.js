// test/judge-seam.test.js -- ADR-0025 acceptance closure.
// D2: locked seam signature returns a typed object or null.
// D3: telemetry counters count seam invocations (null result this round).
// D3: corpus schema gate stays green.

const { execFileSync } = require("child_process");
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

test("judge corpus schema gate passes (ADR-0025 D3)", () => {
  const out = execFileSync(process.execPath, [
    path.join(__dirname, "..", "bench", "polygraph", "check-judge-corpus.js")
  ], { encoding: "utf8" });
  expect(out).toMatch(/PASS jt-h-0001/);
});
