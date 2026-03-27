/**
 * data-engine-real.ts — Real 3-Level Sheet Scanner for Project HAYAG
 *
 * Column constants (0-based):
 *   B  = 1  → Program name OR indicator-group label
 *   C  = 2  → Indicator text
 *   D  = 3  → CO Target         ← Annual Target part 1
 *   E  = 4  → RO Target         ← Annual Target part 2
 *   R  = 17 → SDO Dapitan City accomplishment
 *   S  = 18 → SDO Dipolog City
 *   T  = 19 → SDO Isabela City
 *   U  = 20 → SDO Pagadian City
 *   V  = 21 → SDO Sulu
 *   W  = 22 → SDO Zamboanga City
 *   X  = 23 → SDO Zamboanga del Norte
 *   Y  = 24 → SDO Zamboanga del Sur
 *   Z  = 25 → SDO Zamboanga Sibugay
 *   AA = 26 → Remarks
 *
 * NOTE: Columns G–O (indices 6–14) are SDO *physical targets* (how much each
 * SDO is supposed to achieve). We do NOT use these — the SDO accomplishments
 * are at R–Z only.
 */

import {
  ProgramSection,
  IndicatorGroup,
  IndicatorRow,
  SDO_COL_MAP,
  REMARKS_COL,
  CO_TARGET_COL,
  RO_TARGET_COL,
  parseSdoValue,
  computeAnnualTarget,
} from './data-engine';

// ── Pattern helpers ──────────────────────────────────────────────────────────
const LABEL_PATTERNS = [/^outcome indicator/i, /^output indicator/i];

function isLabelRow(text: string): boolean {
  return LABEL_PATTERNS.some((p) => p.test(text.trim()));
}

/** Matches "1. ...", "2. ...", "a. ...", "b. ...", etc. */
function isDataRow(text: string): boolean {
  return /^[0-9a-zA-Z]+\.\s/.test(text.trim());
}

// ── Known non-program header strings to skip when scanning from row 0 ────────
const SKIP_ROW_PATTERNS = [
  /^DepEd/i,
  /^PIR-RMETA/i,
  /^PREXC\s*\(/i,           // "PREXC (PROGRAM EXPENDITURE CLASSIFICATION)"
  /^NON-PREXC/i,
  /^Concerned\s*Office/i,
  /^PPAs/i,
  /^Physical\s*Target/i,
  /^Accomplishments/i,
  /^CO\s*Target/i,
  /^RO\s*Target/i,
  /^Indicators/i,
];
function isHeaderRow(text: string): boolean {
  return SKIP_ROW_PATTERNS.some((p) => p.test(text.trim()));
}


/**
 * Scan every row of the raw 2D sheet array and build a hierarchical structure:
 *   ProgramSection → IndicatorGroup → IndicatorRow
 *
 * After the first pass, runs a post-processing step that marks "parent label"
 * rows — numbered rows that have NO data of their own and whose next row is a
 * lettered sub-item (a., b., c.). These are rendered as span-full labels.
 */
export function extractRealSheetData(sheetData: unknown[][]): ProgramSection[] {
  const programs: ProgramSection[] = [];
  let currentProgram: ProgramSection | null = null;
  let currentGroup:   IndicatorGroup   | null = null;

  // Start from row 0 so we catch ALL programs including the first two
  // which appear at GViz index 5 and 13 respectively.
  // Header rows (DepEd Region IX, PIR-RMETA, column labels, PREXC classification)
  // are safely ignored: they don't match isLabelRow() or isDataRow(), and the
  // "program" detector below also skips known non-program text.
  const START_ROW = 0;

  for (let i = START_ROW; i < sheetData.length; i++) {
    const row  = (sheetData[i] as unknown[]) ?? [];
    const colA = ((row[0] ?? '') as string).toString().trim();
    const colB = ((row[1] ?? '') as string).toString().trim();
    const colC = ((row[2] ?? '') as string).toString().trim();

    // Skip completely empty rows
    if (!colA && !colB && !colC) continue;

    // ── Level 1: Program header — check ColB first, then ColA ─────────────
    // A program row has content that is NOT a known header, NOT a label,
    // and NOT a numbered data item.
    const programCandidate = colB || colA; // ColB preferred, ColA as fallback
    if (
      programCandidate &&
      !isHeaderRow(programCandidate) &&
      !isLabelRow(programCandidate) &&
      !isDataRow(programCandidate) &&
      !colC  // if ColC also has the text, it's more likely a label/indicator, not program
    ) {
      // Extra guard: must look like a PROGRAM name (all-caps or title case, not column header text)
      const isLikelyProgram = /program|education|development|inclusive|support|human/i.test(programCandidate);
      if (isLikelyProgram) {
        if (currentProgram) programs.push(currentProgram);
        currentProgram = { programName: programCandidate, groups: [] };
        currentGroup   = null;
        continue;
      }
    }

    // ── Level 2: Indicator-group label — can appear in Col B or Col C ─────
    const labelText = isLabelRow(colB) ? colB : isLabelRow(colC) ? colC : null;
    if (labelText) {
      currentGroup = { label: labelText, rows: [] };
      if (currentProgram) currentProgram.groups.push(currentGroup);
      continue;
    }

    // ── Level 3: Actual indicator in Col C ────────────────────────────────
    if (colC && isDataRow(colC)) {
      const sdoValues: Record<string, ReturnType<typeof parseSdoValue>> = {};
      for (const [sdoName, colIdx] of Object.entries(SDO_COL_MAP)) {
        sdoValues[sdoName] = parseSdoValue(row[colIdx]);
      }

      const indicatorRow: IndicatorRow = {
        text: colC,
        isParentLabel: false, // resolved in post-processing below
        annualTarget: computeAnnualTarget(row[CO_TARGET_COL], row[RO_TARGET_COL]),
        sdoValues,
        remarks: ((row[REMARKS_COL] ?? '') as string).toString().trim(),
      };

      if (!currentGroup) {
        currentGroup = { label: '', rows: [] };
        if (currentProgram) currentProgram.groups.push(currentGroup);
      }
      currentGroup.rows.push(indicatorRow);
    }
  }

  if (currentProgram) programs.push(currentProgram);

  // ── Post-processing: mark parent label rows ──────────────────────────────
  // A row is a "parent label" when:
  //   1. It has NO data in D/E or R-Z
  //   2. The next row in the same group starts with a letter (a., b., c.)
  for (const prog of programs) {
    for (const grp of prog.groups) {
      for (let i = 0; i < grp.rows.length - 1; i++) {
        const curr = grp.rows[i];
        const next = grp.rows[i + 1];
        const currHasNoData =
          !curr.annualTarget.total &&
          Object.values(curr.sdoValues).every((v) => !v.raw);
        const nextIsSubItem = /^[a-zA-Z]\.\s/.test(next.text.trim());
        if (currHasNoData && nextIsSubItem) {
          curr.isParentLabel = true;
        }
      }
    }
  }

  return programs;
}

// ─── MOCK DATA (for fallback when sheet is unavailable) ──────────────────────
export function buildMockReportFromCoordinates(): ProgramSection[] {
  const _ = '';

  // 27 columns: A(0) … AA(26)
  // Cols: [A, B, C, D(CO), E(RO), F, G, H, I, J, K, L, M, N, O, P, Q,
  //        R(Dapitan), S(Dipolog), T(Isabela), U(Pagadian), V(Sulu),
  //        W(ZamboCity), X(ZamboNorte), Y(ZamboSur), Z(ZamboSibugay), AA(Remarks)]

  const mockSheetRows: unknown[][] = [
    // Rows 1-6: headers (skipped)
    ...Array(6).fill([]),

    // ── EDUCATION POLICY DEVELOPMENT PROGRAM ──
    [_, 'EDUCATION POLICY DEVELOPMENT PROGRAM', _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],

    // Outcome Indicator(s)
    [_, _, 'Outcome Indicator(s)', _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    // 1. (no SDO data — parent label)
    [_, _, '1. Percentage of completed education researches used for policy development', _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    // 2.
    [_, _, '2. Percentage of satisfactory feedback from clients on issued policies', _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],

    // Output Indicator(s)
    [_, _, 'Output Indicator(s)', _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    // 1. (CO=5, RO=5 → total=10)
    [_, _, '1. Number of policies formulated, reviewed, and issued',
      '5', '5', _, _, _, _, _, _, _, _, _, _, _, _,
      _, _, _, _, _, _, _, _, _,
      '10 policies submitted for review'],
    // 2. (CO=blank, RO=blank, but SDO data present)
    [_, _, '2. Number of education researches completed',
      _, _, _, _, _, _, _, _, _, _, _, _, _, _,
      '8', '8', _, '15', _, _, '10', _, _,
      _],
    // 3.
    [_, _, '3. Number of proposed policies reviewed',
      _, _, _, _, _, _, _, _, _, _, _, _, _, _,
      _, _, _, _, _, _, _, _, _,
      _],

    // ── BASIC EDUCATION INPUTS PROGRAM ──
    [_, 'BASIC EDUCATION INPUTS PROGRAM', _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],

    // Outcome Indicator(s)
    [_, _, 'Outcome Indicator(s)', _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],

    // 1. — parent label (no SDO data, sub-items follow)
    [_, _, '1. Percentage of public schools meeting the standard ratio for teachers',
      _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    // a. Elementary (CO=50, RO=62 → total=112)
    [_, _, 'a. Elementary',
      '50', '62', _, _, _, _, _, _, _, _, _, _, _, _,
      '100% (50/50)', '100% (38/38)', '85.19% (46/54)', '90.23% (55/62)',
      _, _, _, _, _,
      _],
    // b. Junior High School
    [_, _, 'b. Junior High School',
      _, _, _, _, _, _, _, _, _, _, _, _, _, _,
      '88.23% (15/17)', '100% (16/16)', '93.75% (15/16)', '87% (28/33)',
      _, _, _, _, _,
      _],
    // c. Senior High School
    [_, _, 'c. Senior High School',
      _, _, _, _, _, _, _, _, _, _, _, _, _, _,
      '92.86% (13/14)', '93% (13/14)', '84.62% (11/13)', '95% (19/21)',
      _, _, _, _, _,
      _],

    // 2. — parent label
    [_, _, '2. Percentage of public schools meeting the standard ratio for classrooms',
      _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, 'a. Grades 1-10',  _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, 'b. Senior High School', _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],

    // 3. — parent label
    [_, _, '3. Percentage of public schools provided with Information and Communications Technology (ICT) package',
      _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, 'a. Elementary',       _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, 'b. Junior High School', _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, 'c. Senior High School', _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
  ];

  return extractRealSheetData(mockSheetRows);
}
