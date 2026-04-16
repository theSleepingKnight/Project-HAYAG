/**
 * Project HAYAG - Configuration Centralization
 * All repository-specific SDO lists, mappings, and default states should live here.
 */

export const DEFAULT_SDOS = [
  "SDO Dapitan City", 
  "SDO Dipolog City", 
  "SDO Isabela City",
  "SDO Pagadian City", 
  "SDO Zamboanga City",
  "SDO Zamboanga del Norte", 
  "SDO Zamboanga del Sur", 
  "SDO Zamboanga Sibugay",
  "SDO Sulu"
];

/**
 * Mapping logic for individual report sheet names (e.g. "Dap" -> "SDO Dapitan City")
 */
export const SDO_RECOGNITION_MAP: Record<string, string> = {
  'Dap': 'SDO Dapitan City',
  'Dip': 'SDO Dipolog City',
  'Isa': 'SDO Isabela City',
  'Pag': 'SDO Pagadian City',
  'ZamC': 'SDO Zamboanga City',
  'ZDN': 'SDO Zamboanga del Norte',
  'ZDS': 'SDO Zamboanga del Sur',
  'ZSP': 'SDO Zamboanga Sibugay',
  'Sul': 'SDO Sulu',
};

/**
 * Helper to get the canonical SDO name from a sheet title substring
 */
export function getCanonicalSdoName(sheetTitle: string): string | null {
  for (const [key, fullName] of Object.entries(SDO_RECOGNITION_MAP)) {
    if (sheetTitle.includes(key)) return fullName;
  }
  return null;
}

export const INITIAL_GROUPS_STATE = {
  "Group A": DEFAULT_SDOS,
  "Group B": [],
  "Group C": []
};

export const EMPTY_GROUPS_STATE = {
  "Group A": [],
  "Group B": [],
  "Group C": []
};

// ── Quarter label helpers ─────────────────────────────────────────────────────

/**
 * Expands a quarter code to a full ordinal form.
 * "Q1" | "First Quarter" | "1" → "First Quarter"
 * "Q2" → "Second Quarter", etc.
 */
export function formatQuarterLabel(q: string): string {
  const num = q.match(/\d/)?.[0] || '1';
  const labels: Record<string, string> = {
    '1': 'First Quarter',
    '2': 'Second Quarter',
    '3': 'Third Quarter',
    '4': 'Fourth Quarter',
  };
  return labels[num] ?? `Quarter ${num}`;
}

/**
 * Returns the long monitoring report title.
 * e.g. "Q1" → "First Quarter Monitoring Report"
 */
export function formatQuarterTitle(q: string): string {
  return `${formatQuarterLabel(q)} Monitoring Report`;
}

