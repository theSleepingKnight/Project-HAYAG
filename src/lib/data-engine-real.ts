import {
  ProgramSection,
  IndicatorGroup,
  IndicatorRow,
  SheetConfig,
  buildDynamicConfig,
  parseSdoValue,
  computeAnnualTarget,
} from './data-engine';

// ── Pattern helpers ──────────────────────────────────────────────────────────
const LABEL_PATTERNS = [/^outcome indicator/i, /^output indicator/i];

function isLabelRow(text: string): boolean {
  return LABEL_PATTERNS.some((p) => p.test(text.trim()));
}

/** Matches "1. ...", "2. ...", "a. ...", "b. ...", or "- ..." */
function isDataRow(text: string): boolean {
  const t = text.trim();
  // Starts with "1." or "a." or "-"
  return /^([0-9a-zA-Z]+\.|-)/.test(t);
}

function isAllCaps(text: string): boolean {
  const cleaned = text.trim();
  if (cleaned.length < 4) return false;
  // Never treat a data row (1., a., -) as an ALL CAPS Division header
  if (isDataRow(cleaned)) return false; 
  return cleaned === cleaned.toUpperCase();
}

// ── Known non-program header strings ─────────────────────────────────────────
const SKIP_ROW_PATTERNS = [
  /^DepEd/i, /^PIR-RMETA/i, /^PREXC/i, /^NON-PREXC/i, /^Concerned/i,
  /^PPAs/i, /^Physical/i, /^Accomplishments/i, /^CO Target/i, /^RO Target/i, /^Indicators/i,
];
function isHeaderRow(text: string): boolean {
  return SKIP_ROW_PATTERNS.some((p) => p.test(text.trim()));
}

export function extractRealSheetData(sheetData: unknown[][], config: SheetConfig): ProgramSection[] {
  const programs: ProgramSection[] = [];
  let currentProgram: ProgramSection | null = null;
  let currentGroup:   IndicatorGroup   | null = null;

  const isNonPrexc = config.indicatorCol === 1;

  for (let i = 0; i < sheetData.length; i++) {
    const row  = sheetData[i] || [];
    const colA = ((row[0] ?? '') as string).toString().trim();
    const colB = ((row[1] ?? '') as string).toString().trim();
    const colC = ((row[2] ?? '') as string).toString().trim();
    
    // In NON-PREXC, the indicator text is in Col B (index 1)
    const indicatorText = ((row[config.indicatorCol] ?? '') as string).toString().trim();
    
    // Skip if basically empty
    if (!indicatorText && !colA && !colB) continue;
    if (isHeaderRow(indicatorText) || isHeaderRow(colA)) continue;

    // ── Mode A: NON-PREXC (Column A Division + Column B Indicators) ──
    if (isNonPrexc) {
       // 1. Division Search (Check A first, then B for ALL CAPS)
       const headSource = colA || colB; 
       if (isAllCaps(headSource) && !isDataRow(headSource)) {
          if (currentProgram) programs.push(currentProgram);
          currentProgram = { programName: headSource, groups: [] };
          currentGroup = null;
          continue;
       }

       // 2. Data Row Search (Column B)
       if (isDataRow(indicatorText)) {
          const sdoValues: Record<string, any> = {};
          for (const [name, idx] of Object.entries(config.sdoMap)) {
            sdoValues[name] = parseSdoValue(row[idx]);
          }
          const rowObj: IndicatorRow = {
            text: indicatorText,
            isParentLabel: false,
            annualTarget: computeAnnualTarget(row[config.coTargetCol], row[config.roTargetCol]),
            sdoValues,
            remarks: ((row[config.remarksCol] ?? '') as string).toString().trim(),
          };
          if (!currentGroup) {
            currentGroup = { label: '', rows: [] };
            if (currentProgram) currentProgram.groups.push(currentGroup);
          }
          currentGroup.rows.push(rowObj);
       } else if (indicatorText.length > 5 && !isHeaderRow(indicatorText)) {
          // If it's not data and not all-caps division, it's likely a sub-group (ASSESSMENT OF LEARNING OUTCOMES)
          currentGroup = { label: indicatorText, rows: [] };
          if (currentProgram) currentProgram.groups.push(currentGroup);
       }
       continue;
    }

    // ── Mode B: PREXC (Legacy 3-Col Style) ──
    const programCandidate = colB || colA;
    if (programCandidate && !isHeaderRow(programCandidate) && !isLabelRow(programCandidate) && !isDataRow(programCandidate) && !colC) {
      if (/program|education|development|inclusive|support|human/i.test(programCandidate)) {
        if (currentProgram) programs.push(currentProgram);
        currentProgram = { programName: programCandidate, groups: [] };
        currentGroup = null;
        continue;
      }
    }
    const labelText = isLabelRow(colB) ? colB : isLabelRow(colC) ? colC : null;
    if (labelText) {
      currentGroup = { label: labelText, rows: [] };
      if (currentProgram) currentProgram.groups.push(currentGroup);
      continue;
    }
    if (indicatorText && isDataRow(indicatorText)) {
      const sdoValues: Record<string, any> = {};
      for (const [name, idx] of Object.entries(config.sdoMap)) {
        sdoValues[name] = parseSdoValue(row[idx]);
      }
      const rowObj: IndicatorRow = {
        text: indicatorText,
        isParentLabel: false,
        annualTarget: computeAnnualTarget(row[config.coTargetCol], row[config.roTargetCol]),
        sdoValues,
        remarks: ((row[config.remarksCol] ?? '') as string).toString().trim(),
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
        
        const isNextMain = /^([0-9]+\.|[A-Z]\.)/.test(nextText);
        const isNextLetter = /^[a-z]\.\s/.test(nextText);
        const isNextDash   = /^-/.test(nextText);

        const empty = !curr.annualTarget.total && Object.values(curr.sdoValues).every(v => !v.raw);
        
        // Logic: A row is a parent if it's empty AND the next row is "deeper" or a different type
        // 1. Main -> Letter (Standard)
        if (empty && isCurrMain && isNextLetter) curr.isParentLabel = true;
        // 2. Letter -> Dash (Nested)
        if (empty && isCurrLetter && isNextDash) curr.isParentLabel = true;
        // 3. Exception: If both are same level, NOT a parent label
        if (isCurrLetter && isNextLetter) curr.isParentLabel = false;
        if (isCurrDash && isNextDash) curr.isParentLabel = false;
      }
    }
  }

  return programs;
}

export function buildMockReportFromCoordinates(): ProgramSection[] {
  return [];
}
