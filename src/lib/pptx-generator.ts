import PptxGenJS from 'pptxgenjs';
import { SlideData } from './slide-mapper';

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
    x: 0, y: 2.2, w: '100%', align: 'center', fontSize: 24, bold: true, color: 'FFFFFF', fontFace: 'Arial'
  });
  coverSlide.addText('Region IX – Zamboanga Peninsula', {
    x: 0, y: 2.6, w: '100%', align: 'center', fontSize: 18, color: 'FFD700', fontFace: 'Arial'
  });

  coverSlide.addShape(pptx.ShapeType.roundRect, {
    x: 2.5, y: 3.1, w: 5, h: 0.8, fill: { color: 'FFD700' }, rectRadius: 0.1
  });
  coverSlide.addText('PIR REVIEW', {
    x: 0, y: 3.2, w: '100%', align: 'center', fontSize: 42, bold: true, color: '1B365D', fontFace: 'Arial'
  });

  const qLabel = `${quarter.match(/\d/)?.[0] === '1' ? '1st' : quarter.match(/\d/)?.[0] === '2' ? '2nd' : quarter.match(/\d/)?.[0] === '3' ? '3rd' : '4th'} Quarter Monitoring Report`;
  coverSlide.addText(qLabel, {
    x: 0, y: 4.3, w: '100%', align: 'center', fontSize: 22, color: 'FFFFFF', fontFace: 'Arial'
  });

  if (date || location) {
    coverSlide.addText(`${date ? 'Date: ' + date : ''}${date && location ? ' | ' : ''}${location ? 'Location: ' + location : ''}`, {
      x: 0, y: 4.8, w: '100%', align: 'center', fontSize: 12, color: 'C8E1FF', fontFace: 'Arial'
    });
  }

  // ─── 2. AGENDA SLIDE ─────────────────────────────────────────────────────────
  if (outlineItems.length > 0) {
    const agendaSlide = pptx.addSlide();
    agendaSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.7, fill: { color: '1B365D' } });
    agendaSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0.7, w: '100%', h: 0.05, fill: { color: 'FFD700' } });
    agendaSlide.addText('REPORT AGENDA', { x: 0, y: 0.1, w: '100%', align: 'center', fontSize: 26, bold: true, color: 'FFFFFF', fontFace: 'Arial' });

    let yPos = 1.1;
    outlineItems.slice(0, 12).forEach((item, idx) => {
      agendaSlide.addText(`${idx + 1}. ${item}`, { x: 0.8, y: yPos, w: 8.4, fontSize: 16, color: '1B365D', bold: true, fontFace: 'Arial' });
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
        x: 0.5, y: 2.2, w: 9, align: 'center', fontSize: 32, bold: true, color: 'FFFFFF', fontFace: 'Arial'
      });
      divSlide.addText(`${quarter} Monitoring Report`, {
        x: 0.5, y: 3.0, w: 9, align: 'center', fontSize: 18, color: 'FFD700', fontFace: 'Arial'
      });
      continue;
    }

    // Process Data Slide
    const { sdosInThisSlide, programSections, groupName } = slideData;
    const tableRows: any[] = [];
    
    // Header Row
    const headerRow: any[] = [
      { text: "INDICATORS / PPAS", options: { bold: true, fill: '1B365D', color: 'FFFFFF', align: 'center', fontFace: 'Arial', fontSize: 9 } },
      { text: "ANNUAL TARGETS", options: { bold: true, fill: '1B365D', color: 'FFFFFF', align: 'center', fontFace: 'Arial', fontSize: 9 } },
    ];
    sdosInThisSlide.forEach(sdo => {
      headerRow.push({ text: sdo.replace('SDO ', ''), options: { bold: true, fill: '1B365D', color: 'FFFFFF', align: 'center', fontFace: 'Arial', fontSize: 9 } });
    });
    headerRow.push({ text: "REMARKS", options: { bold: true, fill: '1B365D', color: 'FFFFFF', align: 'center', fontFace: 'Arial', fontSize: 9 } });
    tableRows.push(headerRow);

    // Data Rows
    programSections.forEach(program => {
      // Program Header
      tableRows.push([
        { text: program.programName, options: { colspan: 3 + sdosInThisSlide.length, bold: true, fill: 'F1F5F9', color: '1B365D', fontSize: 9, fontFace: 'Arial', h: 0.25 } }
      ]);

      program.groups.forEach(group => {
        // Group Header (Outcome/Output)
        if (group.label) {
          tableRows.push([
            { text: group.label.toUpperCase(), options: { colspan: 3 + sdosInThisSlide.length, italic: true, bold: true, color: '64748B', fontSize: 8, fontFace: 'Arial', margin: 0, h: 0.2 } }
          ]);
        }

        group.rows.forEach(row => {
          if (row.isParentLabel) {
            tableRows.push([
              { text: row.text, options: { colspan: 3 + sdosInThisSlide.length, bold: true, color: '1B365D', fontSize: 8, fontFace: 'Arial', fill: 'F8FAFC', h: 0.25 } }
            ]);
            return;
          }

          const rowData: any[] = [
            { text: row.text, options: { fontSize: 8, fontFace: 'Arial', color: '334155', h: 0.2, margin: 1 } },
            { text: row.annualTarget.total || '—', options: { fontSize: 8, fontFace: 'Arial', align: 'center', color: '334155', h: 0.2, margin: 1 } }
          ];

          sdosInThisSlide.forEach(sdo => {
            const val = row.sdoValues[sdo];
            const pct = val?.percentage;
            const color = (!val || !val.raw) 
              ? '94A3B8' 
              : (pct !== null && pct >= 100) ? '059669' : 'DC2626';
            
            rowData.push({ 
              text: val?.raw || '—', 
              options: { fontSize: 8, fontFace: 'Arial', align: 'center', color, h: 0.2, margin: 1 } 
            });
          });

          rowData.push({ text: row.remarks || '—', options: { fontSize: 7, fontFace: 'Arial', color: '64748B', h: 0.2, margin: 1 } });
          tableRows.push(rowData);
        });
      });
    });

    // Create Slides for this data
    // pptxgenjs autoPage will split this table across slides automatically
    const dataSlide = pptx.addSlide();
    
    // Slide Header
    dataSlide.addText(`${quarter} MONITORING — ${groupName}`, {
      x: 0.5, y: 0.2, w: 9, fontSize: 12, bold: true, color: '1B365D', fontFace: 'Arial'
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

  // ─── 4. DOWNLOAD ─────────────────────────────────────────────────────────────
  await pptx.writeFile({ fileName: filename });
}
