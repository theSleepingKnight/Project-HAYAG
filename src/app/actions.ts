'use server';

import { google } from 'googleapis';
import { headers } from 'next/headers';
import { kv } from '@vercel/kv';
import { extractSpreadsheetId } from '@/lib/google-sheets';

export interface SheetMap {
  prexc: string | null;
  nonPrexc: string | null;
  [key: string]: string | null;
}

export interface DetectionResult {
  success: boolean;
  spreadsheetId?: string;
  foundSheets: SheetMap;
  message?: string;
}

// In-memory store for rudimentary IP-based rate limiting (Fallback for local dev)
const detectionRateLimits = new Map<string, number>();

async function getSheetsClient() {
  let customEmail = process.env.GOOGLE_CLIENT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  // Fallback: Check for a single JSON string if individual vars are not set
  if (!customEmail || !privateKey) {
    const jsonStr = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (jsonStr) {
      try {
        const credentials = JSON.parse(jsonStr);
        customEmail = credentials.client_email;
        privateKey = credentials.private_key;
      } catch (e) {
        console.error("Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON:", e);
      }
    }
  }

  if (!customEmail || !privateKey) {
    throw new Error('Google Credentials are missing in environment variables. Please set GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY, or GOOGLE_SERVICE_ACCOUNT_JSON.');
  }

  // Ensure the environment variable newlines are decoded correctly
  privateKey = privateKey.replace(/\\n/g, '\n');
  
  // Trim quotes and whitespace if the user pasted them with quotes into Vercel UI
  privateKey = privateKey.trim();
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.substring(1, privateKey.length - 1);
  }

  // Base64 Detection & Decoding Fallback
  // If it doesn't look like a standard PEM but looks like Base64 (starts with 'LS0tLS1')
  if (!privateKey.includes('-----BEGIN') && privateKey.startsWith('LS0tLS1')) {
    try {
      privateKey = Buffer.from(privateKey, 'base64').toString('utf8');
    } catch (e) {
       console.error("Base64 Key Decoding failed:", e);
    }
  }

  const auth = new google.auth.JWT({
    email: customEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  return google.sheets({ version: 'v4', auth });
}

export async function detectSheetFeatures(url: string): Promise<DetectionResult> {
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for') || 'unknown-ip';
  const now = Date.now();
  let lastCall = 0;

  // 1. Try Vercel KV (Persistent for Production)
  if (process.env.KV_REST_API_URL) {
    try {
      lastCall = await kv.get<number>(`rl_${ip}`) || 0;
    } catch (e) {
      console.warn("KV Access failed, falling back to memory:", e);
      lastCall = detectionRateLimits.get(ip) || 0;
    }
  } else {
    // 2. Fallback to In-Memory (Local Development)
    lastCall = detectionRateLimits.get(ip) || 0;
  }
  
  if (now - lastCall < 5000) {
    const remainingSeconds = Math.ceil((5000 - (now - lastCall)) / 1000);
    return {
      success: false,
      foundSheets: { prexc: null, nonPrexc: null },
      message: `Cooldown active. Please wait ${remainingSeconds}s before extracting again.`
    };
  }

  // Update Rate Limit
  if (process.env.KV_REST_API_URL) {
    // Set with 30s expiration (self-cleaning)
    await kv.set(`rl_${ip}`, now, { ex: 30 }).catch(() => {});
  } else {
    detectionRateLimits.set(ip, now);
  }

  // ----------------------------------------

  const id = extractSpreadsheetId(url);
  if (!id) {
    return {
      success: false,
      foundSheets: { prexc: null, nonPrexc: null },
      message: 'Invalid Google Sheets URL.'
    };
  }

  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.get({
      spreadsheetId: id,
    });

    const titles = response.data.sheets?.map(s => s.properties?.title || '') || [];
    
    // Pattern Match for mandatory and SDO tabs
    const foundSheets: SheetMap = {
      prexc: titles.find(t => {
        const up = t.toUpperCase();
        return up.includes('PREXC') && !up.includes('NON-PREXC') && !up.includes('NON PREXC');
      }) || null,
      nonPrexc: titles.find(t => t.toUpperCase().includes('NON-PREXC')) || null,
    };

    // Auto-detect SDO-specific tabs ending in -NP (like Dap-NP2026)
    titles.forEach(title => {
      if (title.toUpperCase().includes('-NP')) {
        foundSheets[title] = title;
      }
    });

    return {
      success: true,
      spreadsheetId: id,
      foundSheets
    };
    } catch (error: unknown) {
    console.error("Google API Detection Error:", error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    // Check for specific error types
    if (message.includes('permission_denied') || message.includes('403')) {
      return {
        success: false,
        foundSheets: { prexc: null, nonPrexc: null },
        message: 'Access Denied. Please ensure the Google Sheet is shared with: hayag-extractor@project-hayag-security.iam.gserviceaccount.com'
      };
    }
    
    return {
      success: false,
      foundSheets: { prexc: null, nonPrexc: null },
      message: `Error: ${message}`
    };
  }
}

export async function fetchSheetData(
  spreadsheetId: string,
  sheetName: string
): Promise<{ success: boolean; data: unknown[][]; message: string }> {
  try {
    const sheets = await getSheetsClient();
    
    // 1. Fetch values (A:AZ)
    const range = `'${sheetName.replace(/'/g, "''")}'!A:AZ`; 
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    const rows = response.data.values || [];

    try {
      // 2. Fetch row metadata using a narrow 1-column range to keep payload small.
      //    - `includeGridData: false` prevents rowMetadata from being returned at all.
      //    - Manually hidden rows use `hiddenByUser: true`, NOT `hidden: true`.
      //      (`hidden` is only set by filters, `hiddenByUser` is set by View > Hide Rows.)
      const quotedName = sheetName.replace(/'/g, "''");
      const metadataResponse = await sheets.spreadsheets.get({
        spreadsheetId,
        ranges: [`'${quotedName}'!A:A`],
        includeGridData: true,
        fields: 'sheets.properties.title,sheets.data.rowMetadata',
      });

      // Find the sheet matching our tab name
      const targetSheet = metadataResponse.data.sheets?.find(
        s => s.properties?.title === sheetName
      );
      const rowMetadata = targetSheet?.data?.[0]?.rowMetadata || [];

      // 3. Filter out hidden rows — check both manual hide (hiddenByUser) and filter hide (hidden).
      const filteredData = rows.filter((_, index) => {
        const meta = rowMetadata[index];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return meta?.hiddenByUser !== true && (meta as any)?.hidden !== true;
      });
      return {
        success: true,
        data: filteredData as unknown[][],
        message: 'Success'
      };
    } catch (metaError) {
      console.warn("Failed to fetch row metadata, showing all rows:", metaError);
      return {
        success: true,
        data: rows as unknown[][],
        message: 'Success (Hidden rows filter failed)'
      };
    }
  } catch (error: unknown) {
    console.error("Google API Fetch Error:", error);
    return {
      success: false,
      data: [],
      message: error instanceof Error ? error.message : 'Failed to fetch data'
    };
  }
}
