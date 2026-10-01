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
  // prose and tables never carry one mid-line. At registration this measured
  // exactly ONE hit across the committed md/txt corpus, and it was the R-A file
  // itself - so the added strength cost zero false positives while closing the
  // hole that let the second corruption land. The corpus SIZE is deliberately
  // not pinned here as a constant: it grows with the tree, so a written count is
  // stale on arrival (the rot class M-8 caught in the handoff). Re-derive with
  // `git ls-files | grep -cE '\.(md|txt)$'` if the figure is ever needed.
  //
  // SCOPE AND SIGNATURE LIMITS, stated because round 3 was bitten by them: this
  // signature set is not an exhaustive byte sanitizer, and its blast radius is
  // narrower than it looks. Two blind spots, open by declaration, not closed:
  //   - SCOPE: callers choose which files are scanned, and at the M-7
  //     measurement `scripts/**` was in no caller's scope at all - so a
  //     governance script could carry corruption no caller would ever look at.
  //   - SIGNATURE SET: a mid-file U+FEFF (EF BB BF) is in NEITHER the
  //     control-byte branch NOR the C1 branch, and `docHygiene` returns [] on a
  //     real file carrying one.
  // Either closure is a signature-set/scope change and belongs in its own ADR
  // round. Until then no claim that "byte corruption is closed" is supportable -
  // only "the known instances are repaired".
  // Indexed over the BYTE buffer, not over `t`. The byte loop above reports
  // byte offsets; a second loop indexing the decoded string would put a
  // CHARACTER index into the same hits array, and every multi-byte character
  // earlier in the file would silently shift the second number. grill-t35 p-3
  // measured exactly that: the shipped block printed `@1589` where the true
  // byte index was 1597, because 8 bytes of preceding multi-byte text sat
  // between them. A forensic address that is not replayable defeats the
  // purpose of the convention that produced it - so one unit, everywhere.
  // TAB and LF are single bytes in UTF-8, so byte indexing is exact here.
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] !== 9) continue;
    let j = i - 1;
    while (j >= 0 && buf[j] !== 10) j--;
    if (i - 1 - j > 0) hits.push('mid-line TAB (eaten-$ class) @' + i + ' (byte offset)');
  }
  return hits;
}

// Convenience: the doc-hygiene verdict for one absolute file path.
function docHygieneFile(absPath) {
  return docHygiene(fs.readFileSync(absPath));
}

module.exports = { docHygiene, docHygieneFile };
