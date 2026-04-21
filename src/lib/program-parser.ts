/**
 * program-parser.ts — Project HAYAG
 *
 * Shared utility for parsing DepEd Region IX program names into structured parts:
 *   { division, title, acronym, definition }
 *
 * Patterns handled (from full live-sheet scan, April 2026):
 *
 * P0 — ZamC newline-acronym:  "ACRONYM\nDefinition sentence"
 *      e.g. "SPARE\nSpEd teachers Provided..."
 *
 * P1 — ZamC colon-paragraph:  "TITLE:\nSentence1.\nSentence2."
 *      e.g. "MENTOR for Mental Health Support:\nMental Health..."
 *
 * P2 — ZDS trailing-acronym:  "Full phrase (ACRONYM)"
 *      e.g. "Growing and Restrengthening... (GREAT)"
 *
 * P3 — Hipa hyphen+parens:    "Prefix-ACRONYM (definition)(QUALIFIER)"
 *      e.g. "Hipa-LAGGU (Leading and Gaining...)(QUALITY)"
 *
 * P4 — Hipa hyphen+space:     "Prefix-ACRONYM Definition words (QUALIFIER)"
 *      e.g. "Hipa-AWN Accessibility, Wider Reach... (ACCESS)"
 *
 * P5 — ELEVATE compound dash: "WORD - SUBTITLE (Full Name)"
 *      e.g. "ELEVATE - DIVISION COACHING... (Empowering Learning...)"
 *
 * P6 — Leading-acronym+paren: "ACRONYM (definition...)"
 *      e.g. "REPAIR (Reading and functional literacy...)"
 *
 * P7 — Plain header:          "ALL CAPS WORDS"  (no acronym expansion)
 *      e.g. "CURRICULUM AND LEARNING MANAGEMENT DIVISION"
 *      e.g. "RIZALISTANG ALISTO", "PANUKIDUKI"
 *
 * Division prefix splitting:
 *   If there is a " - " in the name, everything before the LAST " - " becomes
 *   the Division row, and the part after becomes the program name to parse.
 *
 * Used by:
 *   - SlidePreview.tsx  (web preview)
 *   - pdf-generator.ts  (html2canvas)
 *   - pptx-generator.ts (future)
 */

// ── Division qualifier keywords ───────────────────────────────────────────────
const DIVISION_QUALIFIERS = new Set([
  'QUALITY', 'EQUITY', 'ACCESS', 'GOVERNANCE', 'PARTNERSHIP',
  'RESILIENCY', 'RESILLIENCY', 'WELL-BEING', 'ENABLING MECHANISM',
  'EMPOWERMENT', 'EXCELLENCE', 'RESILIENCY AND WELL-BEING', 'RESILLIENCY AND WELL-BEING'
]);

function isDivisionQualifier(text: string): boolean {
  return DIVISION_QUALIFIERS.has(text.trim().toUpperCase());
}

// ── Acrostic-aware casing ─────────────────────────────────────────────────────
const DEPED_ACRONYMS = new Set([
  'SDO', 'SPED', 'ALS', 'MTB', 'CRLA', 'MOOE', 'JDVP', 'NC', 'CSM', 'JHS', 'SGC', 'YES-O', 'LRPO', 'DCP', 'ICT', 'TVL',
  'GREAT', 'TEACH', 'SMART', 'LEARN', 'HEART', 'TRACE', 'RIZALISTANG',
  'RAPID', 'MATH', 'PHIL', 'IRI'
]);

/**
 * Returns the text as-is to respect the user's input casing (ALL CAPS, Mixed, etc.)
 * while maintaining the structure needed for the AcrosticText renderer.
 */
export function toAcrosticCase(text: string, acronym: string): string {
  // We no longer force Title Case. Users want the text to match the sheet exactly.
  // The AcrosticText component in SlidePreview.tsx will still handle 
  // the highlighting by performing its own case-insensitive matching.
  return text;
}

// ── Public types ──────────────────────────────────────────────────────────────
export interface ParsedProgram {
  /** Text shown in the dark Division label row above the program. null = no division row. */
  division: string | null;
  /** Short title / acronym shown in gold ALL-CAPS. */
  title: string;
  /** Pure letters of the acronym used for acrostic highlighting, e.g. "SPARE". */
  acronym: string;
  /** Expanded definition text. null = no definition row. */
  definition: string | null;
}

// ── Private helpers ───────────────────────────────────────────────────────────

/** Returns true if s is a short pure-uppercase acronym (no spaces, 2-15 letters). */
function isAcronymWord(s: string): boolean {
  return /^[A-Z]{2,15}$/.test(s.trim());
}

/**
 * Strips a trailing (QUALIFIER) or bare QUALIFIER from text if it is a known division qualifier.
 * Returns { base: text-without-qualifier, qualifier: the-qualifier-string-or-null }.
 */
function stripTrailingQualifier(text: string): { base: string; qualifier: string | null } {
  // 1. Try with parens
  const m = text.match(/^([\s\S]*?)\s*\(([^)]+)\)\s*$/);
  if (m && isDivisionQualifier(m[2])) {
    return { base: m[1].trim(), qualifier: m[2].trim() };
  }
  // 2. Try bare text at the end
  const upperText = text.toUpperCase();
  const trimmedUpperText = upperText.trim();
  
  // Sort qualifiers by length descending to match longest phrases first
  const sortedQualifiers = Array.from(DIVISION_QUALIFIERS).sort((a, b) => b.length - a.length);
  
  for (const dq of sortedQualifiers) {
    if (trimmedUpperText === dq) {
      return { base: '', qualifier: text.trim() };
    }
    if (upperText.endsWith(' ' + dq) || upperText.endsWith(')' + dq)) {
      const isParen = upperText.endsWith(')' + dq);
      const suffixLen = dq.length + (isParen ? 0 : 1);
      const base = text.slice(0, text.length - suffixLen).trim();
      return { base, qualifier: text.slice(text.length - dq.length) };
    }
  }
  return { base: text.trim(), qualifier: null };
}

// ── Main parser ───────────────────────────────────────────────────────────────
export function parseProgramName(raw: string): ParsedProgram {
  const text = raw.trim();

  // ── P5-Compound: "PREFIX - FULL SUBTITLE (definition)" ─────────────────────
  // Needs to happen BEFORE lastDash split
  // e.g. "ELEVATE - DIVISION COACHING AND MENTORING PROGRAM (Empowering...)"
  const compoundMatch = text.match(/^([A-Z]{2,15})\s+-\s+([A-Z\s&-]+)\s*\((.+)\)\s*$/);
  if (compoundMatch) {
    const prefix   = compoundMatch[1];
    const subTitle = compoundMatch[2].trim();
    const defPart  = compoundMatch[3].trim();
    return {
      division:   null,
      title:      text.replace(/\s*\([^)]+\)\s*$/, '').trim(),
      acronym:    prefix,
      definition: toAcrosticCase(defPart, prefix),
    };
  }

  // ── P8-Prefix: "ACRONYM - Long Definition Without Parens" ────────────────
  // e.g. "GREAT - Growing and Restrengthening Education..."
  const prefixAcronym = text.match(/^([A-Z]{2,15})\s+-\s+(.{15,})$/);
  if (prefixAcronym) {
    const acronym = prefixAcronym[1]; 
    const rawDef  = prefixAcronym[2].trim(); 
    
    // Check if there's a trailing qualifier in defPart
    const { base: cleanDef, qualifier } = stripTrailingQualifier(rawDef);
    
    // Check if the base ends with (ACRONYM) redundantly
    const redundantMatch = cleanDef.match(new RegExp(`^(.*?)\\s*\\(${acronym}\\)\\s*$`, 'i'));
    const finalDef = redundantMatch ? redundantMatch[1].trim() : cleanDef;

    return {
      division:   qualifier, // the acronym itself is the title, no division logic from prefix needed
      title:      acronym,
      acronym:    acronym,
      definition: toAcrosticCase(finalDef, acronym),
    };
  }

  // ── Step 0: Dash-split — extract Division prefix ──────────────────────────
  // Use the LAST " - " so multi-level names like "DIV A - DIV B - PROGRAM" are
  // handled correctly (everything before the last dash = division, after = program).
  const lastDash = text.lastIndexOf(' - ');
  let divisionPart: string | null = null;
  let prog = text;    // the program portion we will parse below

  if (lastDash !== -1) {
    const before = text.slice(0, lastDash).trim();
    const after  = text.slice(lastDash + 3).trim();
    // Only split if the part AFTER the dash looks like a program/acronym
    // (starts with an uppercase letter — avoids splitting "note - something" etc.)
    if (/^[A-Z]/.test(after)) {
      divisionPart = before;
      prog = after;
    }
  }

  // ── Clean up the division label ───────────────────────────────────────────
  // Strip leading "OUTCOME N: " or "OUTCOME N - " prefixes (ZDS uses these as
  // section headers, but we want a clean descriptive division label).
  if (divisionPart) {
    divisionPart = divisionPart
      .replace(/^OUTCOME\s+\d+\s*[:–-]\s*/i, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    if (!divisionPart) {
      divisionPart = null;
    } else {
      divisionPart = toAcrosticCase(divisionPart, '');
    }
  }

  // ── P0: ZamC newline-acronym ─────────────────────────────────────────────
  // "SPARE\nSpEd teachers Provided..."
  // First line = pure ALL-CAPS acronym, rest = definition.
  const nl = prog.indexOf('\n');
  if (nl !== -1) {
    const firstLine = prog.slice(0, nl).trim();
    const rest      = prog.slice(nl + 1).trim();

    // P0: first line is a short pure acronym
    if (isAcronymWord(firstLine) && rest.length >= 5) {
      const { base: cleanDef } = stripTrailingQualifier(rest);
      return {
        division:   divisionPart,
        title:      firstLine,
        acronym:    firstLine,
        definition: toAcrosticCase(cleanDef, firstLine),
      };
    }

    // P1: colon-paragraph style — "TITLE:\nSentence1.\nSentence2."
    const colonPara = prog.match(/^([^\n:]+):\s*\n([\s\S]+)$/);
    if (colonPara) {
      const titleLine = colonPara[1].trim();
      const paraText  = colonPara[2].trim();
      // Extract the leading ALL-CAPS acronym from the title line
      const acronymMatch = titleLine.match(/^([A-Z]{2,15})\b/);
      const acronym = acronymMatch ? acronymMatch[1] : '';
      if (acronym.length >= 2) {
        const { base: cleanTitle, qualifier } = stripTrailingQualifier(titleLine);
        if (qualifier && !divisionPart) divisionPart = qualifier;
        return {
          division:   divisionPart,
          title:      cleanTitle,
          acronym,
          definition: paraText,   // AcrosticText uses sentence-mode for \n text
        };
      }
    }
  }

  // ── Project ABOT style ───────────────────────────────────────────────────
  // "Project ABOT (Access to Better Opportunitites...) Pangarap"
  const abot = prog.match(/^([A-Za-z\s]+?)\s+([A-Z]{2,15})\s*\((.+)\)\s*([A-Za-z\s]*)$/);
  if (abot) {
    const pre     = abot[1].trim();
    const acronym = abot[2];
    const defPart = abot[3].trim();
    const post    = abot[4].trim();
    if (!isDivisionQualifier(defPart)) {
      const fullTitle = `${pre} ${acronym} ${post}`.trim();
      return {
        division:   divisionPart,
        title:      fullTitle,
        acronym,
        definition: toAcrosticCase(defPart, acronym),
      };
    }
  }

  // ── P3: Hipa hyphen+parens (covers missing closing parens & bare qualifiers)
  // "Hipa-LAGGU (Leading...)" or "Hipa-AYAD(Strengthen...) Resiliency and Well-Being"
  const hipaParens = prog.match(/^(.+?-([A-Z]{2,15}))\s*\(([^)]+)\)?([\s\S]*)$/);
  if (hipaParens) {
    const fullTitle = hipaParens[1].trim();
    const acronym   = hipaParens[2].trim();
    const defText   = hipaParens[3].trim();
    const tail      = hipaParens[4].trim(); // might be "Resiliency and Well-Being"
    
    if (!isDivisionQualifier(defText)) {
      const { qualifier: tailQual } = stripTrailingQualifier(tail);
      const qual = tailQual || (isDivisionQualifier(tail) ? tail : null);
      if (tail === '' || qual) {
        return {
          division:   qual || divisionPart,
          title:      fullTitle,
          acronym,
          definition: toAcrosticCase(defText, acronym),
        };
      }
    }
  }

  // ── P4: Hipa hyphen+space ─────────────────────────────────────────────────
  // "Hipa-AWN Accessibility, Wider Reach, nurtured... (ACCESS)"
  // Pattern: "prefix-ACRONYM words words (QUALIFIER)"
  const hipaSpace = prog.match(/^(.+?-([A-Z]{2,15}))\s+(.{5,}?)\s*\(([A-Za-z\s\-]+)\)\s*$/);
  if (hipaSpace) {
    const fullTitle    = hipaSpace[1].trim();
    const acronym      = hipaSpace[2].trim();
    const defText      = hipaSpace[3].trim();
    const qualText     = hipaSpace[4].trim();
    if (!isDivisionQualifier(defText)) {
      const qualifier = isDivisionQualifier(qualText) ? qualText : null;
      return {
        division:   qualifier ? (divisionPart || qualifier) : divisionPart,
        title:      fullTitle,
        acronym,
        definition: toAcrosticCase(defText, acronym),
      };
    }
  }

  // ── P2: ZDS trailing-acronym ─────────────────────────────────────────────
  // "Growing and Restrengthening Education... (GREAT)"
  // Must be: long phrase + (SHORT_CAPS) at the very end, NOT a qualifier keyword.
  const trailingAcronym = prog.match(/^(.{10,}?)\s*\(([A-Z]{2,12})\)\s*$/);
  if (trailingAcronym) {
    const phraseText = trailingAcronym[1].trim();
    const acronym    = trailingAcronym[2].trim();
    if (!isDivisionQualifier(acronym)) {
      return {
        division:   divisionPart,
        title:      acronym,
        acronym,
        definition: toAcrosticCase(phraseText, acronym),
      };
    }
  }

  // ── P6: Leading-acronym + paren definition ────────────────────────────────
  // "ACRONYM (Full expansion of the acronym...)"
  // Pattern: starts with short ALL-CAPS word(s), then a paren block.
  const leadingAcronymParen = prog.match(/^([A-Z]{2,15}(?:\s+[A-Z]{2,15}){0,3})\s*\((.{10,})\)\s*$/);
  if (leadingAcronymParen) {
    const titlePart = leadingAcronymParen[1].trim();
    const defPart   = leadingAcronymParen[2].trim();
    const acronym   = titlePart.split(/\s+/)[0];   // first all-caps word is the acronym
    if (!isDivisionQualifier(defPart)) {
      return {
        division:   divisionPart,
        title:      titlePart,
        acronym,
        definition: toAcrosticCase(defPart, acronym),
      };
    }
    // The parens hold a qualifier → treat as division suffix, no definition
    const { qualifier } = stripTrailingQualifier(prog);
    if (qualifier && !divisionPart) divisionPart = qualifier;
    return {
      division:   divisionPart,
      title:      titlePart,
      acronym,
      definition: null,
    };
  }

  // ── P5: ELEVATE compound — "WORD (Full Name)" with optional qualifier ─────
  // "ELEVATE EQUALS (Quality)"  or  "ELEVATE AIMS (Equity)"
  // A multi-word ALL-CAPS phrase followed by a paren block.
  const elevateCompound = prog.match(/^([A-Z][A-Z\s]{2,}?)\s*\((.{5,})\)\s*$/);
  if (elevateCompound) {
    const titlePart    = elevateCompound[1].trim();
    const parenContent = elevateCompound[2].trim();
    // The last all-caps "word" after a space or the whole thing is the acronym
    const acronymWord  = titlePart.split(/\s+/).pop() || '';
    if (isAcronymWord(acronymWord)) {
      if (!isDivisionQualifier(parenContent)) {
        return {
          division:   divisionPart,
          title:      titlePart,
          acronym:    acronymWord,
          definition: toAcrosticCase(parenContent, acronymWord),
        };
      }
      // Qualifier-only paren
      const { qualifier } = stripTrailingQualifier(prog);
      if (qualifier && !divisionPart) divisionPart = qualifier;
      return {
        division:   divisionPart,
        title:      titlePart,
        acronym:    acronymWord,
        definition: null,
      };
    }
  }

  // ── P7: Fallback — plain title (no acronym expansion) ────────────────────
  // Examples: "CURRICULUM AND LEARNING MANAGEMENT DIVISION"
  //           "RIZALISTANG ALISTO", "PANUKIDUKI"
  // We apply Title Case consistently for a balanced look.
  const acronymFallback = isAcronymWord(prog) ? prog : '';
  const finalTitle = toAcrosticCase(prog, acronymFallback);

  return {
    division:   divisionPart,
    title:      finalTitle,
    acronym:    acronymFallback,
    definition: null,
  };
}
