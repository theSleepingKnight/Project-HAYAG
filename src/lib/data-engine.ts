import { getCanonicalSdoName } from './config';

/**
 * data-engine.ts — Shared types and utility functions for Project HAYAG
 */

// ─── Sheet Configuration ───────────────────────────────────────────────────
export interface SheetConfig {
  indicatorCol: number;    
  labelCol:     number;    
  coTargetCol:  number;    
  roTargetCol:  number;    
  remarksCol:   number;    
  targetRemarksCol?: number; 
  sdoMap: Record<string, number>;
  sdoTargetMap?: Record<string, number>; // Optional SDO-specific target columns (e.g. G-O in PREXC)
}

export function buildDynamicConfig(sheetData: unknown[][], tabName: string, quarterStr: string): SheetConfig {
  const isNonPrexc = tabName.toUpperCase().includes('NON-PREXC') || tabName.toUpperCase().includes('-NP');
  const qNum = parseInt(quarterStr.match(/\d/)?.[0] || '1', 10);

  const config: SheetConfig = {
    indicatorCol: isNonPrexc ? 1 : 2,
    labelCol:     isNonPrexc ? 1 : 2,
    coTargetCol:  isNonPrexc ? 2 : 3,
    roTargetCol:  isNonPrexc ? 3 : 4,
    remarksCol:   35, 
    sdoMap:       {},
  };

  const sdoName = getCanonicalSdoName(tabName);
  const isSdoTab = !!sdoName;

  if (isSdoTab && sdoName) {
    config.coTargetCol = 2;
    config.roTargetCol = 2;
    config.targetRemarksCol = 3;
    config.sdoMap[sdoName] = 2 + (qNum * 2);
    config.remarksCol = 2 + (qNum * 2) + 1;
  } else {
    const sdoKeys = [
      'Dapitan City', 'Dipolog City', 'Isabela City', 'Pagadian City', 'Zamboanga City', 
      'Zamboanga del Norte', 'Zamboanga del Sur', 'Zamboanga Sibugay', 'Sulu'
    ];

    if (tabName.toUpperCase().includes('PREXC') && !isNonPrexc) {
      config.sdoTargetMap = {};
      sdoKeys.forEach((s, i) => {
        // Targets: Columns G to O (Index 6 to 14)
        config.sdoTargetMap![`SDO ${s}`] = 6 + i; 
        // Accomplishments: Columns R to AI (Index 17, 19, 21...) skipping Remarks
        config.sdoMap[`SDO ${s}`] = 17 + (i * 2);
      });
    } else {
      let startCol = isNonPrexc ? 4 : 6; 
      const row4 = sheetData[3] || [];
      for (let c = startCol; c < Math.min(row4.length, startCol + 40); c++) {
        const val = (row4[c] ?? '').toString().trim().toUpperCase();
        if (!val) continue;
        sdoKeys.forEach(s => {
          if (val === s.toUpperCase() || val.includes(s.toUpperCase())) {
            if (!config.sdoMap[`SDO ${s}`]) config.sdoMap[`SDO ${s}`] = c;
          }
        });
      }
    }

    for (let r = 3; r <= 5; r++) {
      const row = sheetData[r] || [];
      for (let c = 0; c < row.length; c++) {
        const val = (row[c] ?? '').toString().trim().toUpperCase();
        if (val === 'REMARKS') config.remarksCol = c;
      }
    }
  }

  return config;
}

// ─── Data Interfaces ─────────────────────────────────────────────────────────

export interface SdoValue {
  raw: string;
  percentage: number | null;
  fraction: string | null;
  numericValue: number | null;
}

export interface AnnualTarget {
  co: string;
  ro: string;
  total: string;
}

export interface IndicatorRow {
  text: string;
  isParentLabel: boolean;
  annualTarget: AnnualTarget;
  sdoValues: Record<string, SdoValue>;
  remarks: string;
  targetRemarks: string;
}

export interface IndicatorGroup {
  label: string;
  rows: IndicatorRow[];
}

export interface ProgramSection {
  programName: string;
  groups: IndicatorGroup[];
}

// ─── Utility Functions ───────────────────────────────────────────────────────

/** 
 * Safely extracts a numeric value from a string, 
 * handling ratios like "1:25" by taking the part after the colon.
 */
function extractNumeric(s: string): number | null {
  const clean = s.replace(/,/g, '').trim();
  if (!clean) return null;
  
  // Ratio handling: "1:25" -> 25 (use denominator)
  if (clean.includes(':')) {
    const parts = clean.split(':');
    const val = parseFloat(parts[parts.length - 1]);
    return isNaN(val) ? null : val;
  }

  // Parenthetical format: "(5.47%) - 466" or "(134/158)" -> extract first number inside parens
  if (clean.startsWith('(')) {
    const parenMatch = clean.match(/^\((\d+\.?\d*)/);
    if (parenMatch) {
      const val = parseFloat(parenMatch[1]);
      return isNaN(val) ? null : val;
    }
  }
  
  // Normal number / percentage: "25%", "302", "90.23%"
  const match = clean.match(/^(\d+\.?\d*)/);
  const val = match ? parseFloat(match[1]) : null;
  return (val !== null && !isNaN(val)) ? val : null;
}

/** Parse a raw cell value into a structured SdoValue */
export function parseSdoValue(raw: unknown, targetRaw?: unknown): SdoValue {
  const str = (raw ?? '').toString().trim();
  const tgt = (targetRaw ?? '').toString().trim();
  
  if (!str) return { raw: '', percentage: null, fraction: null, numericValue: null };

  const actualVal = extractNumeric(str);
  let calculatedPercentage: number | null = null;
  
  if (tgt && actualVal !== null) {
    const targetVal = extractNumeric(tgt);
    if (targetVal && targetVal > 0) {
      // UTILIZATION LOGIC: (Actual / Target) * 100
      calculatedPercentage = Math.round((actualVal / targetVal) * 100);
    }
  }

  return {
    raw: str,
    percentage: calculatedPercentage,
    fraction: tgt || null,
    numericValue: actualVal,
  };
}

export function getAccomplishmentRate(actual: SdoValue | undefined, roTarget: string, indicatorText: string): string | null {
  if (!actual) return null;
  const targetVal = extractNumeric(roTarget);
  const actualVal = actual.numericValue;

  if (targetVal === null || actualVal === null || targetVal === 0) return null;
  const rate = (actualVal / targetVal) * 100;
  const isSpecial = /retention|completion/i.test(indicatorText);
  if (isSpecial) return rate.toFixed(1) + '%';
  return Math.round(rate) + '%';
}

export function computeAnnualTarget(colD: unknown, colE: unknown): AnnualTarget {
  const co = (colD ?? '').toString().trim();
  const ro = (colE ?? '').toString().trim();
  if (!co && !ro) return { co: '', ro: '', total: '' };
  
  const dNum = extractNumeric(co);
  const eNum = extractNumeric(ro);

  if (co && ro && dNum !== null && eNum !== null && !co.includes('%') && !ro.includes('%')) {
    const sum = dNum + eNum;
    return { co, ro, total: Number.isInteger(sum) ? String(sum) : sum.toFixed(2) };
  }
  return { co, ro: ro || '', total: ro || co };
}
