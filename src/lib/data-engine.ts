import { getCanonicalSdoName, DEFAULT_SDOS, SDO_RECOGNITION_MAP } from './config';

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
    const sdoKeys = DEFAULT_SDOS.map(s => s.replace('SDO ', ''));

    // Helper for robust SDO name matching
    const matchSdo = (cellVal: string, sdoFull: string) => {
      const clean = (s: string) => s.replace(/[^A-Z0-9]/gi, '').toUpperCase();
      const val = cellVal.toString().toUpperCase();
      const full = sdoFull.toUpperCase();
      const cleanVal = clean(val);
      const cleanFull = clean(full);
      const abbr = Object.entries(SDO_RECOGNITION_MAP).find(([, v]) => v === `SDO ${sdoFull}`)?.[0]?.toUpperCase();
      
      if (cleanVal === cleanFull || cleanVal.includes(cleanFull) || val.includes(full)) return true;
      if (abbr && (val === abbr || val.includes(` ${abbr}`) || val.startsWith(`${abbr} `) || val.endsWith(` ${abbr}`))) return true;
      
      const keywords = full.split(' ').filter(w => w.length > 2 && w !== 'CITY' && w !== 'DEL');
      if (keywords.length > 1 && keywords.every(k => cleanVal.includes(clean(k)))) return true;
      
      if (full.includes('ISABELA') && val.includes('ISABELA')) return true;
      if (full.includes('SULU') && val.includes('SULU')) return true;

      return false;
    };

    if (tabName.toUpperCase().includes('PREXC') && !isNonPrexc) {
      config.sdoTargetMap = {};
      
      const headerRows = sheetData.slice(0, 15);
      
      // 1. Identify Target columns
      sdoKeys.forEach(s => {
        let found = false;
        for (const row of headerRows) {
          if (found) break;
          for (let c = 5; c < 50; c++) {
            const val = (row[c] ?? '').toString();
            if (matchSdo(val, s) && !val.toUpperCase().includes('ACCOMPLISHMENTS') && !val.toUpperCase().includes('ACTUAL')) {
              config.sdoTargetMap![`SDO ${s}`] = c;
              found = true;
              break;
            }
          }
        }
      });

  // 2. Identify Accomplishment columns for the correct quarter
      let qStartCol = -1;
      const qOrdinals = ['1ST', '2ND', '3RD', '4TH', 'FIRST', 'SECOND', 'THIRD', 'FOURTH'];
      for (const row of headerRows) {
        if (qStartCol !== -1) break;
        for (let c = 5; c < Math.min(row.length, 120); c++) {
          const val = (row[c] ?? '').toString().replace(/\s+/g, ' ').trim().toUpperCase();
          if (!val) continue;

          const isAccomp = val.includes('ACCOMPLISHMENTS') || val.includes('ACTUAL');
          const isCorrectQ = val.includes(`Q${qNum}`) || val.includes(`${qNum}Q`) || 
                             val.includes(qOrdinals[qNum-1]) || 
                             val.includes(qOrdinals[qNum+3]) ||
                             (val.includes('QUARTER') && val.includes(qNum.toString()));
          
          if (isAccomp && isCorrectQ) {
            qStartCol = c;
            break;
          }
        }
      }

      if (qStartCol !== -1) {
        sdoKeys.forEach(s => {
          let found = false;
          for (const row of headerRows) {
            if (found) break;
            // STRICTLY scan from qStartCol forward for accomplishments
            for (let c = qStartCol; c < Math.min(row.length, qStartCol + 80); c++) {
              const val = (row[c] ?? '').toString();
              if (matchSdo(val, s) && !val.toUpperCase().includes('TARGET')) {
                config.sdoMap[`SDO ${s}`] = c;
                found = true;
                break;
              }
            }
          }
        });
      }

      const qOffset = (qNum - 1) * 18;
      sdoKeys.forEach((s, i) => {
        const name = `SDO ${s}`;
        if (config.sdoTargetMap![name] === undefined) config.sdoTargetMap![name] = 6 + i;
        if (config.sdoMap[name] === undefined) config.sdoMap[name] = 17 + qOffset + (i * 2);
      });
    } else {
      const startCol = isNonPrexc ? 4 : 6; 
      const rows = sheetData.slice(0, 15);
      for (const row of rows) {
        for (let c = startCol; c < Math.min(row.length, startCol + 120); c++) {
          const val = (row[c] ?? '').toString();
          if (!val) continue;
          sdoKeys.forEach(s => {
            if (matchSdo(val, s)) {
              if (!config.sdoMap[`SDO ${s}`]) config.sdoMap[`SDO ${s}`] = c;
            }
          });
        }
      }
    }

    // Identify Remarks column
    for (let r = 0; r < 8; r++) {
      const row = sheetData[r] || [];
      for (let c = 10; c < row.length; c++) {
        const val = (row[c] ?? '').toString().trim().toUpperCase();
        if (val === 'REMARKS' || val.includes('REMARKS (Q')) {
          config.remarksCol = c;
        }
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
  
  // Even if accomplishment is empty, we must return the target if it exists
  if (!str && !tgt) {
    return { raw: '', percentage: null, fraction: null, numericValue: null };
  }

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
