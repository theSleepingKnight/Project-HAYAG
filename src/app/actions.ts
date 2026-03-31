'use server';

import { google } from 'googleapis';
import { headers } from 'next/headers';
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

// In-memory store for rudimentary IP-based rate limiting
const detectionRateLimits = new Map<string, number>();

async function getSheetsClient() {
  const customEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!customEmail || !rawKey) {
    throw new Error('Google Credentials are missing in environment variables.');
  }

  // Ensure the environment variable newlines are decoded correctly
  let privateKey = rawKey.replace(/\\n/g, '\n');
  
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
  // --- Rate Limiting Logic (5 seconds) ---
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for') || 'unknown-ip';
  const now = Date.now();
  const lastCall = detectionRateLimits.get(ip) || 0;
  
  if (now - lastCall < 5000) {
    const remainingSeconds = Math.ceil((5000 - (now - lastCall)) / 1000);
    return {
      success: false,
      foundSheets: { prexc: null, nonPrexc: null },
      message: `Cooldown active. Please wait ${remainingSeconds}s before extracting again.`
    };
  }
  detectionRateLimits.set(ip, now);
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
      prexc: titles.find(t => t.toUpperCase().includes('PREXC')) || null,
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
): Promise<{ success: boolean; data: any[][]; message: string }> {
  try {
    const sheets = await getSheetsClient();
    const range = `${sheetName}!A:AZ`; // Scan up to column AZ

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values || [];
    return {
      success: true,
      data: rows,
      message: 'Success'
    };
  } catch (error: any) {
    console.error("Google API Fetch Error:", error);
    return {
      success: false,
      data: [],
      message: error.message || 'Failed to fetch data'
    };
  }
}
