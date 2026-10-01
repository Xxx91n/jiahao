'use strict';
// scripts/shared/doc-hygiene.js - ADR-0092 D-M1 (grill-t35 D-008#2): the
// doc-hygiene signature scanner, EXTRACTED from the inline copy that lived in
// test/adr-0076-wiring.test.js (grill-t18 D-006) so the test pin and
// scripts/check-post-land.js assert the SAME function against the SAME
// signature set. One implementation, two callers, zero drift.
//
// Zero-dependency by construction (required from scripts/** on the R2
// governance surface; scripts/ ships in the tarball). Registered signature
// set (extensible via defer-registry on newly demonstrated classes; NOT an
// exhaustive sanitizer):
//   banned control bytes x00-x08/x0B/x0C/x0E-x1F (tab+LF exempt, CR allowed
//   for CRLF files), lone CR not followed by LF, C1 octal-eaten chars,
//   stripped paths (backtick spans exempt for verbatim citation), stripped
//   $name bullets.
//
// This is a MOVE, not a redesign: the signature set is byte-for-byte the t18
// set. The negative fixtures in test/adr-0076-wiring.test.js are the
// regression lock on the set itself.
//
// Escape discipline (grill-t35 R-A class): the C1 range and the em-dash are
// written as \u escapes, never as literal characters. A literal C1 char is
// the exact byte an escape-interpreting layer eats - the 0x08 backspace that
// opened this round sits one codepoint below the C1 block - so a literal here
// would ship a scanner that cannot detect its own target class. \u form is
// both correct and shell-round-trip safe.

function docHygiene(buf) {
  const hits = [];
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i];
    if (b < 9 || b === 11 || b === 12 || (b > 13 && b < 32)) hits.push('control byte 0x' + b.toString(16) + ' @' + i);
    if (b === 13 && buf[i + 1] !== 10) hits.push('lone CR @' + i);
  }
  const t = buf.toString('utf8');
  if (/[\u0080-\u009f]/.test(t)) hits.push('C1 control char (octal-eaten stray)');
  const noTicks = t.replace(/`[^`]*`/g, '');
  if (/[A-Za-z]:(?![\\\/])[A-Za-z0-9_.-]+\.[a-z]{2,5}/.test(noTicks)) hits.push('stripped-path signature (D:Aworker class)');
  if (/^- {2,}\u2014/m.test(t) || /^- -[a-z]/m.test(t)) hits.push('stripped $name bullet');
  // grill-t35 R-A second instance: a mid-line TAB is the eaten-'$-then-t'
  // signature ('$trend-inventory.json' -> TAB + 'rend-inventory.json'). The
  // t18 set exempted TAB outright, which is exactly how this byte escaped the
  // battery while its sibling 0x08 in the same file was caught.
  //
  // Predicate: a TAB that is not at the start of its line. Indentation TABs
  // (the legitimate use, inside fenced code blocks) always sit at column 0;
  // prose and tables never carry one mid-line. Measured over 848 committed
  // md/txt files at registration: exactly ONE hit, and it is the R-A file
  // itself - so the added strength costs zero false positives while closing
  // the hole that let the second corruption land.
  for (let i = 0; i < t.length; i++) {
    if (t.charAt(i) !== '\t') continue;
    let j = i - 1;
    while (j >= 0 && t.charAt(j) !== '\n') j--;
    if (i - 1 - j > 0) hits.push('mid-line TAB (eaten-$ class) @' + i);
  }
  return hits;
}

// Convenience: the doc-hygiene verdict for one absolute file path.
function docHygieneFile(absPath) {
  return docHygiene(fs.readFileSync(absPath));
}

module.exports = { docHygiene, docHygieneFile };
