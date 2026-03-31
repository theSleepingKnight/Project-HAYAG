/**
 * data-engine.ts — Shared types and utility functions for Project HAYAG
 */

// ─── SDO Column Map (0-based) ───────────────────────────────────────────────
// Columns confirmed from live sheet scan (gid=1210810679):
//   SDO ACCOMPLISHMENTS are in Columns R–Z (indices 17–25):
//     R(17) = Dapitan City
//     S(18) = Dipolog City
//     T(19) = Isabela City
//     U(20) = Pagadian City
//     V(21) = Sulu
//     W(22) = Zamboanga City
//     X(23) = Zamboanga del Norte
//     Y(24) = Zamboanga del Sur
//     Z(25) = Zamboanga Sibugay
//
//   NOTE: Columns G–O (indices 6–14) are SDO *physical targets* — do NOT use these.
// ─── Sheet Configuration ───────────────────────────────────────────────────
export interface SheetConfig {
  indicatorCol: number;    // Where the text "1. Number of..." lives
  labelCol:     number;    // Where "Outcome/Output Indicator" lives
  coTargetCol:  number;    // Annual CO Target
  roTargetCol:  number;    // Annual RO Target
  remarksCol:   number;    // Quarterly accomplishment/explanation remarks
  targetRemarksCol?: number; // Optional Physical target remarks (Col D)
  sdoMap: Record<string, number>;
}

export function buildDynamicConfig(sheetData: unknown[][], tabName: string, quarterStr: string): SheetConfig {
  const isNonPrexc = tabName.toUpperCase().includes('NON-PREXC') || tabName.toUpperCase().includes('-NP');
  const qNum = parseInt(quarterStr.match(/\d/)?.[0] || '1', 10);
  const targetHeaderPrefix = `ACCOMPLISHMENTS (Q${qNum}`;

  const config: SheetConfig = {
    indicatorCol: isNonPrexc ? 1 : 2,
    labelCol:     isNonPrexc ? 1 : 2,
    coTargetCol:  isNonPrexc ? 2 : 3,
    roTargetCol:  isNonPrexc ? 3 : 4,
    remarksCol:   35, 
    sdoMap:       {},
  };

  const isSdoTab = tabName.toUpperCase().includes('-NP');

  if (isSdoTab) {
    // Mapping for Individual SDO tabs (starting with Dapitan)
    const upperTab = tabName.toUpperCase();
    let sdoName = '';
    
    if (upperTab.includes('DAP')) sdoName = 'SDO Dapitan City';
    else if (upperTab.includes('DIP')) sdoName = 'SDO Dipolog City';
    else if (upperTab.includes('ISA')) sdoName = 'SDO Isabela City';
    else if (upperTab.includes('PAG')) sdoName = 'SDO Pagadian City';
    else if (upperTab.includes('ZAMC')) sdoName = 'SDO Zamboanga City';
    else if (upperTab.includes('ZDN')) sdoName = 'SDO Zamboanga del Norte';
    else if (upperTab.includes('ZDS')) sdoName = 'SDO Zamboanga del Sur';
    else if (upperTab.includes('ZSP')) sdoName = 'SDO Zamboanga Sibugay';
    else if (upperTab.includes('SUL')) sdoName = 'SDO Sulu';
    
    if (sdoName) {
      // 1. Both Targets moved to Col C (Index 2)
      config.coTargetCol = 2;
      config.roTargetCol = 2;
      
      // 2. Physical Target Remarks is Col D (Index 3)
      config.targetRemarksCol = 3;

      // 3. Accomplishment Q1 -> Col E (4), Q2 -> Col G (6), etc.
      config.sdoMap[sdoName] = 2 + (qNum * 2);
      
      // 4. Quarterly Remarks Q1 -> Col F (5), Q2 -> Col H (7), etc.
      config.remarksCol = 2 + (qNum * 2) + 1;
    }
  } else {
    // ─── Legacy scanning for Master PREXC/NON-PREXC ───
    const sdoKeys = [
      'Dapitan City', 'Dipolog City', 'Isabela City', 'Pagadian City', 'Zamboanga City', 
      'Zamboanga del Norte', 'Zamboanga del Sur', 'Zamboanga Sibugay', 'Sulu'
    ];

    // 1. Find the start column for the selected Quarter in Row 3
    let startCol = 17; // Default to R (index 17) for PREXC
    const row3 = sheetData[2] || [];
    for (let c = 0; c < row3.length; c++) {
      const val = (row3[c] ?? '').toString().toUpperCase();
      if (val.includes(targetHeaderPrefix)) {
        startCol = c;
        break;
      }
    }

    // 2. Scan Row 4 (SDO names) starting from the quarter's start column
    const row4 = sheetData[3] || [];
    const searchLimit = startCol + 20; 
    
    for (let c = startCol; c < Math.min(row4.length, searchLimit); c++) {
      const val = (row4[c] ?? '').toString().trim();
      const valUp = val.toUpperCase();
      if (!valUp) continue;

      sdoKeys.forEach(s => {
        if (valUp === s.toUpperCase() || valUp.includes(s.toUpperCase())) {
          if (!config.sdoMap[`SDO ${s}`]) {
            config.sdoMap[`SDO ${s}`] = c;
          }
        }
      });

      if (valUp === 'REMARKS') {
        config.remarksCol = c; 
      }
    }
  }

  // 3. Fallback/Target checks in header rows
  for (let r = 0; r < Math.min(sheetData.length, 6); r++) {
    const row = sheetData[r] || [];
    for (let c = 0; c < row.length; c++) {
      const val = (row[c] ?? '').toString().trim().toUpperCase();
      if (val === 'CO TARGET') config.coTargetCol = c;
      if (val === 'RO TARGET') config.roTargetCol = c;
    }
  }

  return config;
}

// ─── Data Interfaces ─────────────────────────────────────────────────────────

export interface SdoValue {
  raw: string;
  percentage: number | null;
  fraction: string | null;
  numericValue: number | null; // Leading number for calculations
}

/**
 * Structured breakdown of Annual Physical Target.
 * Stored separately so the UI can render:
 *   CO: 8   RO: 8   Total: 16
 */
export interface AnnualTarget {
  co: string;    // Raw value from Col D (CO Target)
  ro: string;    // Raw value from Col E (RO Target)
  total: string; // Computed sum (if both numeric) or best single value
}

/** A single numbered/lettered indicator row (e.g. "1. Percentage of..." or "a. Elementary") */
export interface IndicatorRow {
  text: string;
  /** If true, this row is a parent heading (e.g. "1. Percentage of...") that has sub-items below it.
   *  It should render as a left-aligned label span — no data columns. */
  isParentLabel: boolean;
  annualTarget: AnnualTarget;
  sdoValues: Record<string, SdoValue>;
  remarks: string;       // Quarterly Accomplishment Remarks
  targetRemarks: string; // Physical Target Remarks (Column D)
}

/** A sub-classification group within a program (e.g. "Outcome Indicator(s)") */
export interface IndicatorGroup {
  label: string;
  rows: IndicatorRow[];
}

/** A program block (e.g. "EDUCATION POLICY DEVELOPMENT PROGRAM") */
export interface ProgramSection {
  programName: string;
  groups: IndicatorGroup[];
}

// ─── Utility Functions ───────────────────────────────────────────────────────

/** Parse a raw cell value into a structured SdoValue */
export function parseSdoValue(raw: unknown): SdoValue {
  const str = (raw ?? '').toString().trim();
  if (!str) return { raw: '', percentage: null, fraction: null, numericValue: null };

  const percentMatch  = str.match(/(\d+\.?\d*)%/);
  const fractionMatch = str.match(/\(([^)]+)\)/);
  const numMatch      = str.match(/^(\d+\.?\d*)/); // Capture leading raw number

  return {
    raw: str,
    percentage:  percentMatch  ? parseFloat(percentMatch[1])  : null,
    fraction:    fractionMatch ? fractionMatch[1]              : null,
    numericValue: numMatch     ? parseFloat(numMatch[1])      : null,
  };
}

/**
 * Calculates (Accomplishment / RO Target) % and formats it based on User Rules:
 * - Round to whole number by default.
 * - Keep precision for "Retention rate" or "Completion rate".
 */
export function getAccomplishmentRate(actual: SdoValue | undefined, roTarget: string, indicatorText: string): string | null {
  if (!actual) return null;

  const roNumMatch = roTarget.match(/^(\d+\.?\d*)/);
  const targetVal = roNumMatch ? parseFloat(roNumMatch[1]) : null;
  const actualVal = actual.numericValue;

  if (targetVal === null || actualVal === null || targetVal === 0) return null;

  const rate = (actualVal / targetVal) * 100;
  
  // Rule: Round off except for Retention or Completion rate
  const isSpecial = /retention|completion/i.test(indicatorText);
  if (isSpecial) {
    return rate.toFixed(1) + '%'; // 1 decimal place for precision
  }
  return Math.round(rate) + '%';
}

/**
 * Compute Annual Physical Target from ColD (CO) and ColE (RO).
 * Returns an AnnualTarget object so the UI can show the breakdown.
 *
 * Display rules:
 *   - Both numeric → total = D + E
 *   - Only one present → total = that one
 *   - Neither → all empty strings
 */
export function computeAnnualTarget(colD: unknown, colE: unknown): AnnualTarget {
  const co = (colD ?? '').toString().trim();
  const ro = (colE ?? '').toString().trim();

  if (!co && !ro) return { co: '', ro: '', total: '' };

  const dNum = parseFloat(co);
  const eNum = parseFloat(ro);

  // Both are plain numbers → sum them
  if (co && ro && !isNaN(dNum) && !isNaN(eNum) && !co.includes('%') && !ro.includes('%')) {
    const sum = dNum + eNum;
    return {
      co,
      ro,
      total: Number.isInteger(sum) ? String(sum) : sum.toFixed(2),
    };
  }

  // Only CO
  if (co && !ro) return { co, ro: '', total: co };

  // Only RO
  if (!co && ro) return { co: '', ro, total: ro };

  // Both present but non‑numeric (e.g. percentages) — keep as-is
  return { co, ro, total: co };
}
