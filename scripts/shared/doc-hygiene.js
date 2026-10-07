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
  // SCOPE AND SIGNATURE LIMITS, restated after ADR-0093 D-1/D-2 (grill-t36
  // D-004). The two blind spots this comment used to declare OPEN are now
  // closed BY DECLARATION, and the two sentences are deliberately separate:
  //
  //   Closed by declaration: the scope. `scripts/shared/tracked-text.js`
  //   enumerates every tracked text file - gitattributes `text` primary,
  //   NUL-sniff fallback, oversized disclosed skip, index-union-tree base -
  //   and callers pass a root and nothing else. The caller-chosen blast radius
  //   is withdrawn, so `scripts/**` is no longer outside every caller's view.
  //
  //   The class remains open: byte corruption. What is registered is a
  //   SIGNATURE SET with a disclosed boundary (the oversized skip), not a
  //   sanitizer, and a set that is finite is one edit away from a class it does
  //   not name. Known instances are repaired, never closed. No sentence here
  //   may merge the two claims.
  //
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
  // ADR-0093 D-2 (grill-t36 D-004, wave two): two signature classes join the
  // set. Both are asserted at the BYTE layer, never the decoded-string layer,
  // for the p-3 reason stated above - a reported offset an auditor cannot
  // replay is worse than no offset at all.
  //
  // (1) U+FEFF, the `Out-File -Encoding utf8` / escape-eating prefix, as the
  //     EF BB BF triplet. The predicate is widened to ANY OFFSET by its own
  //     declared widening, separate from the two widenings named in D-1.
  //     Offset 0 is inside "any offset" deliberately: this repository's own
  //     policy is UTF-8 without BOM, so a leading BOM is not a legitimate
  //     exception here - it is the same write path that produces the mid-file
  //     case, and a rule that exempts the first byte exempts the writer that
  //     chooses to put it there.
  for (let i = 0; i + 2 < buf.length; i++) {
    if (buf[i] === 0xef && buf[i + 1] === 0xbb && buf[i + 2] === 0xbf) {
      hits.push('U+FEFF (EF BB BF, any offset) @' + i + ' (byte offset)');
    }
  }
  // (2) The bidi directional-control family: U+202A-202E, U+2066-2069,
  //     U+200E, U+200F, U+061C. Trojan Source (CVE-2021-42574) is the
  //     external class; the in-repo reason is that the rendering form of a
  //     governance document IS the assertion carrier, so a bidi sequence can
  //     make "never closed" read as "closed" on the one surface a reader
  //     trusts without inspecting bytes.
  //     Written as \u escapes, never as literal characters - same escape
  //     discipline as the C1 range above. A literal bidi control here would be
  //     a byte this scanner is meant to flag, sitting inside the scanner.
  const BIDI = ['\u202a', '\u202b', '\u202c', '\u202d', '\u202e',
    '\u2066', '\u2067', '\u2068', '\u2069',
    '\u200e', '\u200f', '\u061c'];
  for (const cp of BIDI) {
    const needle = Buffer.from(cp, 'utf8');
    const at = buf.indexOf(needle);
    if (at !== -1) {
      hits.push('bidi directional control U+'
        + cp.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')
        + ' @' + at + ' (byte offset)');
    }
  }
  return hits;
}

// Convenience: the doc-hygiene verdict for one absolute file path.
function docHygieneFile(absPath) {
  return docHygiene(fs.readFileSync(absPath));
}

module.exports = { docHygiene, docHygieneFile };
