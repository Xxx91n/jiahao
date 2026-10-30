// Instrumented wrapper: runs the real hook, logs stdin/stdout/stderr/exit,
// then replays the output and exits with the same code. The gate logic is
// unchanged; this only records the hook's own exit code for the #80 evidence.
const { spawn } = require('child_process');
const fs = require('fs');

const [logFile, script, ...args] = process.argv.slice(2);
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { input += c; });
process.stdin.on('end', () => {
  const child = spawn(process.execPath, [script, ...args], { env: process.env, stdio: ['pipe', 'pipe', 'pipe'] });
  let out = '';
  let err = '';
  child.stdout.on('data', (d) => { out += d; process.stdout.write(d); });
  child.stderr.on('data', (d) => { err += d; process.stderr.write(d); });
  child.on('close', (code) => {
    fs.appendFileSync(logFile, JSON.stringify({
      ts: new Date().toISOString(),
      script,
      input,
      stdout: out,
      stderr: err,
      code,
    }) + '\n');
    process.exit(code == null ? 1 : code);
  });
  child.stdin.end(input);
});
