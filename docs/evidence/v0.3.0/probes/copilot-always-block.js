// Always-block agentStop probe hook for Copilot CLI.
// Point .github/copilot/settings.json agentStop at this file.
// Observed on 1.0.105: 9 invocations, 8 continuations, then the CLI ended.
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { input += c; });
process.stdin.on('end', () => {
  process.stdout.write(JSON.stringify({ decision: 'block', reason: 'ALWAYS BLOCK: counter probe' }) + '\n');
  process.exit(0);
});
