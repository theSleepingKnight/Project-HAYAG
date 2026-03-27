/**
 * data-engine.ts — Shared types and utility functions for Project HAYAG
 */

// ─── SDO Column Map (0-based) ───────────────────────────────────────────────
// From live GViz data analysis, SDO accomplishments are in Columns G–O:
//   Row 4 header row confirms:
//     G(6)  = Dapitan City
//     H(7)  = Dipolog City    (number type in GViz)
//     I(8)  = Isabela City
//     J(9)  = Pagadian City
//     K(10) = (empty/Sulu province label — skip)
//     L(11) = Sulu             (number type in GViz)
//     M(12) = Zamboanga City   (number type in GViz)
//     N(13) = Zamboanga del Norte
//     O(14) = Zamboanga del Sur (number type in GViz)
// NOTE: Zamboanga Sibugay does not have its own column in this sheet version.
export const SDO_COL_MAP: Record<string, number> = {
  'SDO Dapitan City':        6,  // Col G
  'SDO Dipolog City':        7,  // Col H
  'SDO Isabela City':        8,  // Col I
  'SDO Pagadian City':       9,  // Col J
  'SDO Sulu':                11, // Col L
  'SDO Zamboanga City':      12, // Col M
  'SDO Zamboanga del Norte': 13, // Col N
  'SDO Zamboanga del Sur':   14, // Col O
};

export const REMARKS_COL   = 26; // Col AA (confirmed from GViz cols array)
export const CO_TARGET_COL = 3;  // Col D
export const RO_TARGET_COL = 4;  // Col E

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
