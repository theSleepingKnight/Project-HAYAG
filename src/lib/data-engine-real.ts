import { 
  SheetConfig, 
  SdoValue, 
  IndicatorRow, 
  IndicatorGroup, 
  ProgramSection, 
  parseSdoValue,
  computeAnnualTarget
} from './data-engine';

// ── Shared Extraction Helpers ────────────────────────────────────────────────

const collapseAcronyms = (text: string) => text.replace(/\s+/g, ' ').trim();

const isLabelRow = (text: string) => {
  const up = text.toUpperCase();
  return up.includes('OUTCOME INDICATOR') || up.includes('OUTPUT INDICATOR') || up.includes('INDICATOR LIST');
};

const isDataRow = (text: string) => /^\d+\./.test(text) || /^[A-Za-z]\b/.test(text);

// ── Known non-program header strings ─────────────────────────────────────────
const SKIP_ROW_PATTERNS = [
  /^DepEd/i, /^PIR-RMETA/i, /^Concerned/i,
  /^Physical Accomplishments/i, /^Accomplishments/i, /^CO Target/i, /^RO Target/i, /^Indicator List/i,
];

function isHeaderRow(text: string): boolean {
  return SKIP_ROW_PATTERNS.some((p) => p.test(text.trim()));
}

function isPureHeader(row: unknown[], config: any): boolean {
  // Check CO/RO target columns
  const startCheckCol = config.coTargetCol;
  for (let c = startCheckCol; c < Math.min(row.length, startCheckCol + 2); c++) {
    const val = (row[c] ?? '').toString().trim();
    if (val && val.toLowerCase() !== 'null' && val !== '—' && val !== '-') return false;
  }
  
  // Also check SDO columns (if any SDO has data, it's NOT a pure header)
  if (config.sdoMap) {
    for (const idx of Object.values(config.sdoMap) as number[]) {
      const val = (row[idx] ?? '').toString().trim();
      if (val && val.toLowerCase() !== 'null' && val !== '—' && val !== '-') return false;
    }
  }
  if (config.sdoTargetMap) {
    for (const idx of Object.values(config.sdoTargetMap) as number[]) {
      const val = (row[idx] ?? '').toString().trim();
      if (val && val.toLowerCase() !== 'null' && val !== '—' && val !== '-') return false;
    }
  }

  return true;
}

export function extractRealSheetData(sheetData: unknown[][], config: SheetConfig): ProgramSection[] {
  const programs: ProgramSection[] = [];
  let currentProgram: ProgramSection | null = null;
  let currentGroup: IndicatorGroup | null = null;
  let consecutiveHeaders: string[] = [];

  for (let i = 0; i < sheetData.length; i++) {
    const row  = sheetData[i] || [];
    const colA = collapseAcronyms(((row[0] ?? '') as string).toString().trim());
    const colB = collapseAcronyms(((row[1] ?? '') as string).toString().trim());
    
    let indicatorText = collapseAcronyms(((row[config.indicatorCol] ?? '') as string).toString().trim());
    
    // Intelligent fallback for cell placement errors
    if (!indicatorText && (colA || colB)) {
      indicatorText = colB || colA;
    }
    
    // Skip if basically empty
    if (!indicatorText) continue;
    
    // Only skip if the indicator column itself is a known header
    if (isHeaderRow(indicatorText)) continue;

    const programCandidate = indicatorText;
    
    // Check if the row has ANY numerical data
    const hasNoData = isPureHeader(row, config);

    // 1. Identify Program Headers
    if (programCandidate && !isLabelRow(programCandidate) && !isDataRow(programCandidate) && programCandidate.length > 4 && hasNoData) {
      // If we already collected indicators, this starts a completely new section.
      if (currentProgram && currentProgram.groups.length > 0) {
        programs.push(currentProgram);
        currentProgram = null;
        consecutiveHeaders = [];
      }

      consecutiveHeaders.push(programCandidate);
      const combinedName = consecutiveHeaders.join(' - ');

      if (!currentProgram) {
        currentProgram = { programName: combinedName, groups: [] };
      } else {
        currentProgram.programName = combinedName;
      }
      
      currentGroup = null;
      continue;
    }

    // 2. Check if row is a grouping label
    if (isLabelRow(programCandidate)) {
      currentGroup = { label: programCandidate, rows: [] };
      if (!currentProgram) {
        currentProgram = { programName: 'General Program', groups: [] };
      }
      currentProgram.groups.push(currentGroup);
      continue;
    }

    // 3. Extract Indicator Data
    if (indicatorText && (isDataRow(indicatorText) || indicatorText.length > 5)) {
      const sdoValues: Record<string, SdoValue> = {};
      for (const [name, idx] of Object.entries(config.sdoMap)) {
        const sdoTargetIdx = config.sdoTargetMap ? config.sdoTargetMap[name] : undefined;
        let effectiveTarget = row[config.roTargetCol];

        if (sdoTargetIdx !== undefined) {
          const sdoTargetRaw = row[sdoTargetIdx];
          const sdoTgtStr = (sdoTargetRaw ?? '').toString().trim();
          effectiveTarget = (sdoTgtStr === '—' || sdoTgtStr === '-') ? '' : sdoTargetRaw;
        }
        
        sdoValues[name] = parseSdoValue(row[idx], effectiveTarget);
      }
      
      const targetRem = config.targetRemarksCol ? ((row[config.targetRemarksCol] ?? '') as string).toString().trim() : '';
      const accompRem = ((row[config.remarksCol] ?? '') as string).toString().trim();
      
      const rowObj: IndicatorRow = {
        text: indicatorText,
        isParentLabel: false,
        annualTarget: computeAnnualTarget(row[config.coTargetCol], row[config.roTargetCol]),
        sdoValues,
        remarks: accompRem,
        targetRemarks: targetRem,
      };

      if (!currentProgram) {
        currentProgram = { programName: 'General Program', groups: [] };
      }
      if (!currentGroup) {
        currentGroup = { label: '', rows: [] };
        currentProgram.groups.push(currentGroup);
      }
      currentGroup.rows.push(rowObj);
    }
  }

  if (currentProgram) programs.push(currentProgram);
  return programs;
}
