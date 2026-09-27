const fs = require('fs');
const path = require('path');

const mcpDir = path.join(__dirname, '..', 'jiahao-mcp');

test('jiahao-mcp/index.js exists', () => {
  expect(fs.existsSync(path.join(mcpDir, 'index.js'))).toBe(true);
});

test('jiahao-mcp/package.json exists and is valid', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(mcpDir, 'package.json'), 'utf8'));
  expect(pkg.name).toBe('jiahao-mcp');
  expect(pkg.dependencies['@modelcontextprotocol/sdk']).toBeDefined();
  expect(pkg.dependencies.zod).toBeDefined();
});

test('index.js has registerPrompt for jiahao', () => {
  const content = fs.readFileSync(path.join(mcpDir, 'index.js'), 'utf8');
  expect(content).toContain("registerPrompt");
  expect(content).toContain("'jiahao'");
  expect(content).toContain('Jiahao Verifier Discipline');
});

test('index.js has registerTool for jiahao_instructions', () => {
  const content = fs.readFileSync(path.join(mcpDir, 'index.js'), 'utf8');
  expect(content).toContain("registerTool");
  expect(content).toContain('jiahao_instructions');
  expect(content).toContain('readOnlyHint');
});

test('index.js uses StdioServerTransport', () => {
  const content = fs.readFileSync(path.join(mcpDir, 'index.js'), 'utf8');
  expect(content).toContain('StdioServerTransport');
  expect(content).toContain('server.connect');
});

test('index.js reads SKILL.md from parent src/', () => {
  const content = fs.readFileSync(path.join(mcpDir, 'index.js'), 'utf8');
  expect(content).toContain('SKILL.md');
  expect(content).toContain('buildInstructions');
});

test('index.js supports mode parameter (lite/full/ultra)', () => {
  const content = fs.readFileSync(path.join(mcpDir, 'index.js'), 'utf8');
  expect(content).toContain('lite');
  expect(content).toContain('full');
  expect(content).toContain('ultra');
});

test('index.js syntax is valid', () => {
  const { execSync } = require('child_process');
  execSync('node -c ' + path.join(mcpDir, 'index.js'), { encoding: 'utf8', timeout: 5000 });
  // exit 0 = valid syntax
});
