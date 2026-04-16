import {
  ProgramSection,
  IndicatorGroup,
  IndicatorRow,
  SheetConfig,
  parseSdoValue,
  computeAnnualTarget,
  SdoValue,
} from './data-engine';

// ── Pattern helpers ──────────────────────────────────────────────────────────
const LABEL_PATTERNS = [/^outcome indicator/i, /^output indicator/i];

function isLabelRow(text: string): boolean {
  return LABEL_PATTERNS.some((p) => p.test(text.trim()));
}

/** Matches "1. ...", "2. ...", "a. ...", "b. ...", or "- ...", as well as standard Indicator phrases. */
function isDataRow(text: string): boolean {
  const t = text.trim();
  // Starts with "1.", "a.", "-", or standard metric keywords "Percentage", "Number", "Proportion"
  if (/^(Percentage|Number|Proportion)\b/i.test(t)) return true;
  return /^([0-9a-zA-Z]+\.|-)/.test(t);
}


// ── Known non-program header strings ─────────────────────────────────────────
const SKIP_ROW_PATTERNS = [
  /^DepEd/i, /^PIR-RMETA/i, /^Concerned/i,
  /^Physical/i, /^Accomplishments/i, /^CO Target/i, /^RO Target/i, /^Indicators/i,
];

function isHeaderRow(text: string): boolean {
  return SKIP_ROW_PATTERNS.some((p) => p.test(text.trim()));
}

function isPureHeader(row: unknown[], startCheckCol: number): boolean {
  for (let c = startCheckCol; c < row.length; c++) {
    const val = (row[c] ?? '').toString().trim();
    if (val && val.toLowerCase() !== 'null') return false;
  }
  return true;
}

export function extractRealSheetData(sheetData: unknown[][], config: SheetConfig): ProgramSection[] {
  const programs: ProgramSection[] = [];
  let currentProgram: ProgramSection | null = null;
  let currentGroup:   IndicatorGroup   | null = null;
  
  let consecutiveHeaders: string[] = [];

  for (let i = 0; i < sheetData.length; i++) {
    const row  = sheetData[i] || [];
    const colA = ((row[0] ?? '') as string).toString().trim();
    const colB = ((row[1] ?? '') as string).toString().trim();
    
    let indicatorText = ((row[config.indicatorCol] ?? '') as string).toString().trim();
    
    // Intelligent fallback for cell placement errors (e.g. human error moving text to Col A or B instead of C)
    if (!indicatorText && (colA || colB)) {
      indicatorText = colB || colA;
    }
    
    // Skip if basically empty
    if (!indicatorText) continue;
    if (isHeaderRow(indicatorText) || isHeaderRow(colA)) continue;

    const programCandidate = indicatorText || colB || colA;
    
    // User Logic: If the row has NO target/accomplishment data, it's a Header
    const hasNoData = isPureHeader(row, config.coTargetCol);

    if (programCandidate && !isHeaderRow(programCandidate) && !isLabelRow(programCandidate) && !isDataRow(programCandidate) && programCandidate.length > 4) {
      if (hasNoData) {
        // If we already collected indicators, this starts a completely new section.
        if (currentProgram && currentProgram.groups.length > 0) {
          programs.push(currentProgram);
          currentProgram = null;
          consecutiveHeaders = []; // Reset the header builder
        }

        consecutiveHeaders.push(programCandidate);
        const combinedName = consecutiveHeaders.join(' - ');

        if (!currentProgram) {
          currentProgram = { programName: combinedName, groups: [] };
        } else {
          currentProgram.programName = combinedName; // Appending the program name
        }
        
        currentGroup = null;
        continue;
      }
    }

    // 2. Check if row is a grouping label (e.g. Outcome/Output Indicator(s))
    if (isLabelRow(programCandidate)) {
      currentGroup = { label: programCandidate, rows: [] };
      if (currentProgram) currentProgram.groups.push(currentGroup);
      continue;
    }

    // 3. Extract Indicator Data (Must start with a number/letter or be valid)
    if (indicatorText && (isDataRow(indicatorText) || indicatorText.length > 5)) {
      const sdoValues: Record<string, SdoValue> = {};
      for (const [name, idx] of Object.entries(config.sdoMap)) {
        sdoValues[name] = parseSdoValue(row[idx]);
      }
      // Capture both remarks without merging
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
      if (!currentGroup) {
        currentGroup = { label: '', rows: [] };
        if (currentProgram) currentProgram.groups.push(currentGroup);
      }
      currentGroup.rows.push(rowObj);
    }
  }

  if (currentProgram) programs.push(currentProgram);

  // Post-process parent labels
  for (const p of programs) {
    for (const g of p.groups) {
      for (let i = 0; i < g.rows.length - 1; i++) {
        const curr = g.rows[i];
        const next = g.rows[i+1];
        
        const currText = curr.text.trim();
        const nextText = next.text.trim();

        // Indentation signatures
        const isCurrMain = /^([0-9]+\.|[A-Z]\.)/.test(currText); // e.g. "1." or "A."
        const isCurrLetter = /^[a-z]\.\s/.test(currText);         // e.g. "a."
        const isCurrDash   = /^-/.test(currText);                // e.g. "-"
        
        const isNextLetter = /^[a-z]\.\s/.test(nextText);
        const isNextDash   = /^-/.test(nextText);
        const isNextMain   = /^([0-9]+\.|[A-Z]\.)/.test(nextText);

        const empty = !curr.annualTarget.total && Object.values(curr.sdoValues).every(v => !v.raw);
        
        // Logic: A row is a parent if it's empty AND the next row is a formal list item
        // 1. Un-numbered descriptive row -> Letter or Number list (e.g. "Number of..." -> "1." or "a.")
        if (empty && (isNextLetter || isNextMain || isNextDash) && !isCurrLetter && !isCurrDash && !isCurrMain) curr.isParentLabel = true;
        // 2. Main number -> Letter (Standard)
        if (empty && isCurrMain && isNextLetter) curr.isParentLabel = true;
        // 3. Letter -> Dash (Nested)
        if (empty && isCurrLetter && isNextDash) curr.isParentLabel = true;
        // 4. Exception: Same-level items are NOT parent labels
        if (isCurrLetter && isNextLetter) curr.isParentLabel = false;
        if (isCurrDash && isNextDash) curr.isParentLabel = false;
        if (isCurrMain && isNextMain) curr.isParentLabel = false;
      }
    }
  }

  return programs;
}

export function buildMockReportFromCoordinates(): ProgramSection[] {
  return [];
}
