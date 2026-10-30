// Throwaway Codex user-level Stop hook: exit 2 + stderr.
// Observed on codex-cli 0.163.0: one turn, no continuation.
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { input += c; });
process.stdin.on('end', () => {
  process.stderr.write('EXIT2 BLOCK: verify first\n');
  process.exit(2);
});
