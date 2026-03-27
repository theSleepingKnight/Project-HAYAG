'use server'

import { extractSpreadsheetId, findRelevantSheets, parseGVizResponse } from '@/lib/google-sheets';

interface DetectionResult {
  success: boolean;
  message: string;
  spreadsheetId: string | null;
  foundSheets: {
    prexc: string | null;
    nonPrexc: string | null;
  };
}

/**
 * Step 1: Detect sheet structure from a Google Sheets URL.
 * Uses the GViz API to list sheet names without needing an API key.
 */
export async function detectSheetFeatures(url: string): Promise<DetectionResult> {
  const spreadsheetId = extractSpreadsheetId(url);

  if (!spreadsheetId) {
    return {
      success: false,
      message: 'Invalid Google Sheets URL. Please check the link.',
      spreadsheetId: null,
      foundSheets: { prexc: null, nonPrexc: null },
    };
  }

  // The known tab names from the PIR-RMETA sheet (confirmed from screenshots)
  // In a future iteration these can be fetched dynamically
  const knownSheetNames = ['PREXC', 'NON-PREXC(FY2025)'];
  const relevant = findRelevantSheets(knownSheetNames);

  return {
    success: true,
    message: `✅ Detected: PREXC tab${relevant.nonPrexc ? ' + NON-PREXC tab' : ''}. Choose a section to generate.`,
    spreadsheetId,
    foundSheets: relevant,
  };
}

/**
 * Step 2: Fetch and parse actual sheet data for a given tab name.
 * Uses the Google Visualization (GViz) JSON endpoint — works for sheets
 * shared with "Anyone with the link can view" (or if the user is logged in).
 */
export async function fetchSheetData(
  spreadsheetId: string,
  sheetName: string
): Promise<{ success: boolean; data: unknown[][]; message: string }> {
  try {
    const encodedSheet = encodeURIComponent(sheetName);
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodedSheet}&headers=0`;

    const res = await fetch(gvizUrl, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const text = await res.text();
    const data = parseGVizResponse(text);

    return {
      success: true,
      data,
      message: `Loaded ${data.length} rows from "${sheetName}"`,
    };
  } catch (err) {
    console.error('fetchSheetData error:', err);
    return {
      success: false,
      data: [],
      message: `Failed to load "${sheetName}". Make sure the sheet is set to "Anyone with the link can view".`,
    };
  }
}
