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
  remarksCol:   number;    // Remarks column
  sdoMap: Record<string, number>;
}

const PREXC_SDO_MAP: Record<string, number> = {
  'SDO Dapitan City':          17, // Col R
  'SDO Dipolog City':          18, // Col S
  'SDO Isabela City':          19, // Col T
  'SDO Pagadian City':         20, // Col U
  'SDO Sulu':                  21, // Col V
  'SDO Zamboanga City':        22, // Col W
  'SDO Zamboanga del Norte':   23, // Col X
  'SDO Zamboanga del Sur':     24, // Col Y
  'SDO Zamboanga Sibugay':     25, // Col Z
};

const NON_PREXC_SDO_MAP: Record<string, number> = {
  'SDO Dapitan City':          15, // Col P
  'SDO Dipolog City':          16, // Col Q
  'SDO Isabela City':          17, // Col R
  'SDO Pagadian City':         18, // Col S
  'SDO Zamboanga City':        19, // Col T
  'SDO Zamboanga del Norte':   20, // Col U
  'SDO Zamboanga del Sur':     21, // Col V
  'SDO Zamboanga Sibugay':     22, // Col W
  // Sulu is missing in the primary NON-PREXC summary columns, 
  // though it has its own tab. We'll map it to ZS as a fallback or leave it.
};

const PREXC_STATIC_SDO_MAP: Record<string, number> = {
  'SDO Dapitan City':          17, // Col R
  'SDO Dipolog City':          18, // Col S
  'SDO Isabela City':          19, // Col T
  'SDO Pagadian City':         20, // Col U
  'SDO Sulu':                  21, // Col V
  'SDO Zamboanga City':        22, // Col W
  'SDO Zamboanga del Norte':   23, // Col X
  'SDO Zamboanga del Sur':     24, // Col Y
  'SDO Zamboanga Sibugay':     25, // Col Z
};

export function buildDynamicConfig(sheetData: unknown[][], sheetName: string): SheetConfig {
  const isNonPrexc = sheetName.toUpperCase().includes('NON-PREXC');
  
  // ── 1. PREXC (Legacy BED No. 2) — Revert to Hardcoded Map for Reliability ──
  if (!isNonPrexc) {
    return {
      indicatorCol: 2, // Col C
      labelCol:     2, // Col C
      coTargetCol:  3, // Col D (Annual/Baseline part 1)
      roTargetCol:  4, // Col E (Annual/GAA part 2)
      remarksCol:   26, // Col AA
      sdoMap:       PREXC_STATIC_SDO_MAP,
    };
  }

  // ── 2. NON-PREXC (Single-Column B Hierarchy) — Keep Smart Scanner ──────────
  let config: SheetConfig = {
    indicatorCol: 1, // Col B
    labelCol:     1, // Col B
    coTargetCol:  2, // Col C
    roTargetCol:  3, // Col D
    remarksCol:   24, // Col Y
    sdoMap:       {},
  };

  const sdoKeys = [
    'Dapitan City', 'Dipolog City', 'Isabela City', 'Pagadian City', 'Zamboanga City', 
    'Zamboanga del Norte', 'Zamboanga del Sur', 'Zamboanga Sibugay', 'Sulu'
  ];

  let foundAccomHeader = false;

  for (let r = 0; r < Math.min(sheetData.length, 10); r++) {
    const row = sheetData[r] || [];
    for (let c = 0; c < row.length; c++) {
      const val = (row[c] ?? '').toString().trim();
      const valUp = val.toUpperCase();

      if (valUp.includes('ACCOMPLISHMENT')) foundAccomHeader = true;

      sdoKeys.forEach(s => {
        if (valUp.includes(s.toUpperCase())) {
           // Overwrite if it's the accomplishment (right-side)
           if (foundAccomHeader || c > 14) {
             config.sdoMap[`SDO ${s}`] = c;
           }
        }
      });

      if (valUp === 'CO TARGET') config.coTargetCol = c;
      if (valUp === 'RO TARGET') config.roTargetCol = c;
      if (valUp === 'REMARKS')   config.remarksCol   = c;
    }
  }

  return config;
}

// ─── Data Interfaces ─────────────────────────────────────────────────────────

export interface SdoValue {
  raw: string;
  percentage: number | null;
  fraction: string | null;
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
  remarks: string;
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
  if (!str) return { raw: '', percentage: null, fraction: null };

  const percentMatch  = str.match(/(\d+\.?\d*)%/);
  const fractionMatch = str.match(/\(([^)]+)\)/);
  return {
    raw: str,
    percentage:  percentMatch  ? parseFloat(percentMatch[1])  : null,
    fraction:    fractionMatch ? fractionMatch[1]              : null,
  };
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
