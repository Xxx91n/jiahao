// Throwaway Codex user-level Stop hook: exit 0 + decision block, every time.
// Observed on codex-cli 0.163.0: 80+ continuations with no host cap.
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { input += c; });
process.stdin.on('end', () => {
  process.stdout.write(JSON.stringify({ decision: 'block', reason: 'ALWAYS BLOCK: loop probe' }) + '\n');
  process.exit(0);
});
