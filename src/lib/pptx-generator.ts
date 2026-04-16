import PptxGenJS from 'pptxgenjs';
import { SlideData } from './slide-mapper';
import { getAccomplishmentRate } from './data-engine';
import { formatQuarterLabel, formatQuarterTitle } from './config';
import { parseProgramName } from './program-parser';

export interface PptxOptions {
  filename: string;
  quarter: string;
  date: string;
  location: string;
  outlineItems: string[];
}

/**
 * Generate a PowerPoint Presentation for Project HAYAG
 * Using REAL EDITABLE TABLES instead of images.
 */
export async function generateHAYAGPptx(
  slidesData: SlideData[],
  options: PptxOptions
) {
  const { filename: rawFilename, quarter, date, location, outlineItems } = options;
  const filename = rawFilename.replace(/\s+/g, '_').replace('.pdf', '.pptx');

  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'A4_LANDSCAPE', width: 11.69, height: 8.27 });
  pptx.layout = 'A4_LANDSCAPE';

  // ─── 1. COVER SLIDE ──────────────────────────────────────────────────────────
  const coverSlide = pptx.addSlide();
  coverSlide.background = { color: '1B365D' }; 

  coverSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.15, h: '100%', fill: { color: 'FFD700' } });
  coverSlide.addShape(pptx.ShapeType.rect, { x: 9.85, y: 0, w: 0.15, h: '100%', fill: { color: 'FFD700' } });

  coverSlide.addText('DEPARTMENT OF EDUCATION', {
    x: 0, y: 2.2, w: '100%', align: 'center', fontSize: 24, bold: true, color: 'FFFFFF', fontFace: 'Inter'
  });
  coverSlide.addText('Region IX – Zamboanga Peninsula', {
    x: 0, y: 2.6, w: '100%', align: 'center', fontSize: 18, color: 'FFD700', fontFace: 'Inter'
  });

  coverSlide.addShape(pptx.ShapeType.roundRect, {
    x: 2.5, y: 3.1, w: 5, h: 0.8, fill: { color: 'FFD700' }, rectRadius: 0.1
  });
  coverSlide.addText('PIR REVIEW', {
    x: 0, y: 3.2, w: '100%', align: 'center', fontSize: 42, bold: true, color: '1B365D', fontFace: 'Inter'
  });

  const qLabel = formatQuarterTitle(quarter);
  coverSlide.addText(qLabel, {
    x: 0, y: 4.3, w: '100%', align: 'center', fontSize: 22, color: 'FFFFFF', fontFace: 'Inter'
  });

  if (date || location) {
    coverSlide.addText(`${date ? 'Date: ' + date : ''}${date && location ? ' | ' : ''}${location ? 'Location: ' + location : ''}`, {
      x: 0, y: 4.8, w: '100%', align: 'center', fontSize: 12, color: 'C8E1FF', fontFace: 'Inter'
    });
  }

  // ─── 2. AGENDA SLIDE ─────────────────────────────────────────────────────────
  if (outlineItems.length > 0) {
    const agendaSlide = pptx.addSlide();
    agendaSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.7, fill: { color: '1B365D' } });
    agendaSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0.7, w: '100%', h: 0.05, fill: { color: 'FFD700' } });
    agendaSlide.addText('REPORT AGENDA', { x: 0, y: 0.1, w: '100%', align: 'center', fontSize: 26, bold: true, color: 'FFFFFF', fontFace: 'Inter' });

    let yPos = 1.1;
    outlineItems.slice(0, 12).forEach((item, idx) => {
      agendaSlide.addText(`${idx + 1}. ${item}`, { x: 0.8, y: yPos, w: 8.4, fontSize: 16, color: '1B365D', bold: true, fontFace: 'Inter' });
      yPos += 0.4;
    });
  }

  // ─── 3. DATA SLIDES (REAL TABLES) ────────────────────────────────────────────
  for (const slideData of slidesData) {
    if (slideData.type === 'divider') {
      const divSlide = pptx.addSlide();
      divSlide.background = { color: 'F8FAFC' };
      divSlide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 2.0, w: 9, h: 1.5, fill: { color: '1B365D' } });
      divSlide.addText(slideData.sectionTitle || '', {
        x: 0.5, y: 2.2, w: 9, align: 'center', fontSize: 32, bold: true, color: 'FFFFFF', fontFace: 'Inter'
      });
      divSlide.addText(formatQuarterTitle(quarter), {
        x: 0.5, y: 3.0, w: 9, align: 'center', fontSize: 18, color: 'FFD700', fontFace: 'Inter'
      });
      continue;
    }

    // Process Data Slide
    const { sdosInThisSlide, programSections, groupName } = slideData;
    const tableRows: PptxGenJS.TableRow[] = [];
    
    // Header Row
    const headerRow: PptxGenJS.TableRow = [
      { text: "INDICATORS / PPAS", options: { bold: true, fill: { color: '1B365D' }, color: 'FFFFFF', align: 'center', fontFace: 'Inter', fontSize: 9 } },
      { text: "RO TARGET", options: { bold: true, fill: { color: '1B365D' }, color: 'FFFFFF', align: 'center', fontFace: 'Inter', fontSize: 9 } },
      { text: "REMARKS (RO TARGET)", options: { bold: true, fill: { color: '1B365D' }, color: 'FFFFFF', align: 'center', fontFace: 'Inter', fontSize: 9 } },
    ];
    sdosInThisSlide.forEach(sdo => {
      const displaySdo = sdo.includes('SDO ') ? sdo.replace('SDO ', 'SDO\n') + '\n(Accomplishments)' : sdo;
      headerRow.push({ 
        text: displaySdo, 
        options: { bold: true, fill: { color: '1B365D' }, color: 'FFFFFF', align: 'center', fontFace: 'Inter', fontSize: 8 } 
      });
    });
    headerRow.push({ text: "REMARKS", options: { bold: true, fill: { color: '1B365D' }, color: 'FFFFFF', align: 'center', fontFace: 'Inter', fontSize: 9 } });
    tableRows.push(headerRow);

    // Data Rows
    programSections.forEach(program => {
      const { division, title, definition } = parseProgramName(program.programName);

      if (division) {
        tableRows.push([
          { text: division.toUpperCase(), options: { colspan: 4 + sdosInThisSlide.length, bold: true, fill: { color: 'E2E8F0' }, color: '0F172A', fontSize: 10, fontFace: 'Inter' } }
        ]);
      }

      // Main Title
      tableRows.push([
        { text: title.toUpperCase(), options: { colspan: 4 + sdosInThisSlide.length, bold: true, fill: { color: 'F1F5F9' }, color: '1B365D', fontSize: 9, fontFace: 'Inter' } }
      ]);

      // Definition / Explanation (Muted & smaller)
      if (definition) {
        tableRows.push([
          { text: definition, options: { colspan: 4 + sdosInThisSlide.length, italic: true, bold: false, fill: { color: 'F1F5F9' }, color: '64748B', fontSize: 8, fontFace: 'Inter', margin: 1 } }
        ]);
      }

      program.groups.forEach(group => {
        if (group.label) {
          tableRows.push([
            { text: group.label.toUpperCase(), options: { colspan: 4 + sdosInThisSlide.length, italic: true, bold: true, color: '64748B', fontSize: 8, fontFace: 'Inter', margin: 0 } }
          ]);
        }

        group.rows.forEach(row => {
          if (row.isParentLabel) {
            tableRows.push([
              { text: row.text, options: { colspan: 4 + sdosInThisSlide.length, bold: true, color: '1B365D', fontSize: 8, fontFace: 'Inter', fill: { color: 'F8FAFC' } } }
            ]);
            return;
          }

          const isIndividualSdoTab = groupName === 'Individual Report';
          const rowData: PptxGenJS.TableRow = [
            { text: row.text, options: { fontSize: 8, fontFace: 'Inter', color: '334155', margin: 1 } },
            { text: row.annualTarget.ro || '—', options: { fontSize: 8, fontFace: 'Inter', align: 'center', color: '334155', margin: 1 } },
            { text: row.targetRemarks || '—', options: { fontSize: 8, fontFace: 'Inter', align: 'center', color: '64748B', margin: 1 } }
          ];

          sdosInThisSlide.forEach(sdo => {
            const val = row.sdoValues[sdo];
            const color = (!val || !val.raw) 
              ? '94A3B8' : '0F172A';
            
            const cellText = val?.raw || '—';
            const match = cellText !== '—' ? cellText.match(/^(.*?)\s*(\(.*)$/) : null;
            
            const rate = isIndividualSdoTab ? getAccomplishmentRate(val, row.annualTarget.ro, row.text) : null;
            const contentTexts: PptxGenJS.TextProps[] = [];

            if (match && match[1]) {
               contentTexts.push({ text: match[1].trim(), options: { fontSize: 8, fontFace: 'Inter', color } });
               contentTexts.push({ text: `\n${match[2].trim()}`, options: { fontSize: 7, fontFace: 'Inter', color: '64748B' } });
            } else {
               contentTexts.push({ text: cellText, options: { fontSize: 8, fontFace: 'Inter', color } });
            }

            if (rate && cellText !== '—') {
               contentTexts.push({ text: `\n(${rate})`, options: { fontSize: 8, bold: true, fontFace: 'Inter', color: 'DC2626' } });
            }

            rowData.push({
               text: contentTexts,
               options: { align: 'center', margin: 1 }
            });
          });

          rowData.push({ text: row.remarks || '—', options: { fontSize: 7, fontFace: 'Inter', color: '64748B', margin: 1 } });
          tableRows.push(rowData);
        });
      });
    });

    // Create Slides for this data
    // pptxgenjs autoPage will split this table across slides automatically
    const dataSlide = pptx.addSlide();
    
    // Slide Header
    dataSlide.addText(`${formatQuarterLabel(quarter)} MONITORING — ${groupName}`, {
      x: 0.5, y: 0.2, w: 9, fontSize: 12, bold: true, color: '1B365D', fontFace: 'Inter'
    });
    dataSlide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 0.45, w: 9, h: 0.02, fill: { color: 'FFD700' } });

    dataSlide.addTable(tableRows, {
      x: 0.5, y: 0.6, w: 10.6, // Wider table to use A4 space
      autoPage: true,
      autoPageRepeatHeader: true,
      autoPageLineWeight: 0,
      border: { pt: 0.5, color: 'E2E8F0' },
      valign: 'middle',
      margin: 0,
      fontSize: 8,
    });
  }

  // ─── END SLIDE ─────────────────────────────────────────────────────────────
  const endSlide = pptx.addSlide();
  endSlide.background = { color: '1B365D' };

  endSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.15, h: '100%', fill: { color: 'FFD700' } });
  endSlide.addShape(pptx.ShapeType.rect, { x: 9.85, y: 0, w: 0.15, h: '100%', fill: { color: 'FFD700' } });

  endSlide.addText('DEPARTMENT OF EDUCATION', {
    x: 0, y: 2.2, w: '100%', align: 'center', fontSize: 24, bold: true, color: 'FFFFFF', fontFace: 'Inter'
  });
  endSlide.addText('Region IX – Zamboanga Peninsula', {
    x: 0, y: 2.6, w: '100%', align: 'center', fontSize: 18, color: 'FFD700', fontFace: 'Inter'
  });

  endSlide.addShape(pptx.ShapeType.roundRect, {
    x: 2.5, y: 3.1, w: 5, h: 0.8, fill: { color: 'FFD700' }, rectRadius: 0.1
  });
  endSlide.addText('Thank you', {
    x: 0, y: 3.2, w: '100%', align: 'center', fontSize: 42, bold: true, color: '1B365D', fontFace: 'Inter'
  });

  // ─── 4. DOWNLOAD ─────────────────────────────────────────────────────────────
  await pptx.writeFile({ fileName: filename });
}
