// One-shot Claude-schema Stop hook for the Copilot CLI .claude/settings.json
// probe. Blocks once, then passes. Copy next to a writable marker path.
const fs = require('fs');
const path = require('path');

const marker = path.join(__dirname, '.claude-block.marker');
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { input += c; });
process.stdin.on('end', () => {
  if (!fs.existsSync(marker)) {
    fs.writeFileSync(marker, '1');
    process.stdout.write(JSON.stringify({ decision: 'block', reason: 'CLAUDE SETTINGS BLOCK: verify first' }) + '\n');
    process.exit(0);
  }
  process.exit(0);
});
