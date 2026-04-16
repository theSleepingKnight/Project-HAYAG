import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Manually parse .env.local
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) {
    let val = value.join('=').trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.substring(1, val.length - 1);
    env[key] = val;
  }
});

async function analyzeSheet() {
  const privateKey = env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
  const auth = new google.auth.JWT({
    email: env.GOOGLE_CLIENT_EMAIL,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = '1B6Ncl7Kf_4bGHIv54zXb_yfiWXBXJEDKcTNHJ6BdpAQ';

  try {
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });
    const titles = spreadsheet.data.sheets.map(s => s.properties.title);
    console.log('Available Sheets:', titles.join(', '));

    const useRange = 'PREXC!A1:Z100';
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: useRange,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log('No data found.');
      return;
    }

    // Print headers to analyze SDOs and classifications
    console.log('--- Row 3 (Possible Quarter/Header) ---');
    console.log(rows[0] ? rows[0].join(' | ') : 'Empty');
    console.log('\n--- Row 4 (Possible SDO Names) ---');
    console.log(rows[1] ? rows[1].join(' | ') : 'Empty');

    const range2 = 'NON-PREXC(FY2025)!A1:Z500';
    const response2 = await sheets.spreadsheets.values.get({ spreadsheetId, range: range2 });
    const rows2 = response2.data.values || [];
    console.log('\n--- Searching NON-PREXC ---');
    for (let i = 0; i < rows2.length; i++) {
        const text = (rows2[i]||[]).join(' ').toLowerCase();
        if (text.includes('shared') || text.includes('ppa') || text.includes('classifications')) {
            console.log(`L${i+1}: ${rows2[i].join(' | ')}`);
        }
    }

  } catch (err) {
    console.error('The API returned an error: ' + err);
  }
}

analyzeSheet();
