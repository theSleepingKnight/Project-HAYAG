/**
 * google-sheets.ts — Project HAYAG
 * Utilities for parsing Google Sheets URLs and GViz responses.
 */

import { sheets_v4 } from 'googleapis';

/** Extract the Spreadsheet ID from a Google Sheets URL */
export function extractSpreadsheetId(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

/** Find the PREXC tab name from a list of sheet titles */
export function findRelevantSheets(sheets: sheets_v4.Schema$Sheet[]) {
  const titles = sheets.map(s => s.properties?.title || '');

  let prexc = titles.find(t => t.toUpperCase().includes('PREXC'));
  const nonPrexc = titles.find(t => t.toUpperCase().includes('NON-PREXC'));

  if (!prexc && titles.includes('PREXC')) {
    prexc = 'PREXC';
  }

  return {
    prexc: prexc || null,
    nonPrexc: nonPrexc || null
  };
}

/**
 * Parse the Google Visualization (GViz) JSON response into a 2D array.
 *
 * The GViz endpoint wraps its JSON response in a JSONP callback.
 * We strip that wrapper and parse the inner JSON object.
 * Each cell has "v" (raw value) and "f" (formatted string).
 * We prefer "f" for percentages because "v" may be a decimal like 0.85 instead of "85%".
 */
export function parseGVizResponse(rawText: string): unknown[][] {
  // Strip the JSONP wrapper: /*O_o*/\ngoogle.visualization.Query.setResponse(...);\n
  const jsonStart = rawText.indexOf('{');
  const jsonEnd = rawText.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) return [];

  const jsonStr = rawText.substring(jsonStart, jsonEnd + 1);
  const parsed = JSON.parse(jsonStr);

  const table = parsed?.table;
  if (!table?.rows) return [];

  return table.rows.map((row: { c: Array<{ v: unknown; f?: string } | null> }) =>
    row.c.map((cell) => {
      if (!cell) return '';
      // Prefer formatted string (f) for percentages/fractions, else raw value (v)
      if (cell.f !== undefined && cell.f !== null) return cell.f;
      if (cell.v !== undefined && cell.v !== null) return cell.v;
      return '';
    })
  );
}

/** Normalizes complex cell values like "85.19% (46/54)" into structured data */
export function parseSdoValue(value: string) {
  const percentageMatch = value.match(/(\d+\.?\d*)%/);
  const fractionMatch = value.match(/\(([^)]+)\)/);
  return {
    percentage: percentageMatch ? parseFloat(percentageMatch[1]) : null,
    fraction: fractionMatch ? fractionMatch[1] : null,
    raw: value,
  };
}
