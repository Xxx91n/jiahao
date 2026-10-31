// Throwaway Antigravity probe: always emit decision: block on exit 0.
const fs = require('fs');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { input += c; });
process.stdin.on('end', () => {
  let parsed = {};
  try { parsed = JSON.parse(input); } catch (e) {}
  console.log(JSON.stringify({
    decision: 'block',
    reason: `ANTIGRAVITY ALWAYS BLOCK probe (executionNum: ${parsed.executionNum ?? 'unknown'})`,
  }));
  process.exit(0);
});
