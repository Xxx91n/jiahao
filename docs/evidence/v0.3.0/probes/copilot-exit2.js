// Throwaway Copilot agentStop hook: prints the decision field but exits 2.
// Observed on 1.0.105: hook exit 2; the host logged it as failed and the turn
// ended without a continuation, even though the decision field was present.
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { input += c; });
process.stdin.on('end', () => {
  process.stdout.write(JSON.stringify({ decision: 'block', reason: 'COPILOT EXIT2 PROBE' }) + '\n');
  process.exit(2);
});
