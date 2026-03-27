import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// ─── Constants ─────────────────────────────────────────────────────────────────
const A4_W_PX  = 1122;   // A4 landscape at 96 DPI (841.89pt × 96/72)
const SCALE    = 1.5;    // Capture scale for crisp rendering
const MARGIN   = 30;     // PDF point margin
const FOOTER_H = 22;     // PDF points reserved for footer

// ─── Public interface ───────────────────────────────────────────────────────────
export interface PdfOptions {
  filename:     string;
  quarter:      string;           // e.g. 'Q1' or 'First Quarter'
  date:         string;           // e.g. '2026-03-26'
  location:     string;           // e.g. 'DepEd Region IX, Pagadian City'
  outlineItems: string[];         // Agenda / outline list
}

// ─── Main Entry Point ───────────────────────────────────────────────────────────
export async function generateHAYAGPdf(
  hiddenContainerId: string,
  options: PdfOptions
) {
  const container = document.getElementById(hiddenContainerId);
  if (!container) {
    console.error(`PDF Error: Hidden container #${hiddenContainerId} not found.`);
    return;
  }

  const { filename, quarter, date, location, outlineItems } = options;

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pdfW = pdf.internal.pageSize.getWidth();   // 841.89 pt
  const pdfH = pdf.internal.pageSize.getHeight();  // 595.28 pt

  // px→pt ratio for A4 landscape (DPI conversion: 72/96 = 0.75)
  const ratio = (pdfW - 2 * MARGIN) / A4_W_PX;

  // ── 1. COVER PAGE ─────────────────────────────────────────────────────────────
  drawCoverPage(pdf, pdfW, pdfH, quarter, date, location);

  // ── 2. OUTLINE / AGENDA PAGE ─────────────────────────────────────────────────
  if (outlineItems.length > 0) {
    pdf.addPage();
    drawOutlinePage(pdf, pdfW, pdfH, outlineItems);
  }

  // ── 3. DATA TABLE SLIDES ──────────────────────────────────────────────────────
  const slides = Array.from(container.children) as HTMLElement[];

  for (const slide of slides) {
    const thead = slide.querySelector('thead') as HTMLElement | null;
    const tbody = slide.querySelector('tbody') as HTMLElement | null;

    // 3a. Capture header for repeat
    let headerCanvas: HTMLCanvasElement | null = null;
    let scaledHeaderHPt = 0;
    if (thead) {
      headerCanvas = await html2canvas(thead, {
        scale: SCALE, useCORS: true, backgroundColor: '#1B365D',
        width: A4_W_PX, windowWidth: A4_W_PX,
      });
      scaledHeaderHPt = thead.offsetHeight * ratio;
    }

    // 3b. Capture full slide
    const fullCanvas = await html2canvas(slide, {
      scale: SCALE, useCORS: true, backgroundColor: '#ffffff',
      width: A4_W_PX, windowWidth: A4_W_PX,
    });

    const totalCssPx = fullCanvas.height / SCALE;

    // 3c. Pre-compute row bounds
    const allRows  = tbody ? Array.from(tbody.querySelectorAll('tr')) as HTMLElement[] : [];
    const rowBounds = allRows.map(r => ({
      top:    getOffsetFromAncestor(r, slide),
      bottom: getOffsetFromAncestor(r, slide) + r.offsetHeight,
    }));

    // 3d. Auto-fit: if content is ≤ 140% of one page, scale to fit single page
    const page1MaxPx   = (pdfH - 2 * MARGIN - FOOTER_H) / ratio;
    const singleFitPx  = page1MaxPx * 1.4;  // 140% threshold
    const useAutoFit   = totalCssPx <= singleFitPx;

    pdf.addPage();

    if (useAutoFit && totalCssPx > page1MaxPx) {
      // Scale the canvas down to fit in one page — visually shrinks text
      drawAutoFitSlide(pdf, fullCanvas, pdfW, pdfH, ratio, totalCssPx, page1MaxPx);
    } else {
      // Multi-page rendering with repeating header
      await renderSlideMultiPage(
        pdf, fullCanvas, headerCanvas,
        scaledHeaderHPt, ratio,
        pdfW, pdfH, totalCssPx, rowBounds,
        filename
      );
    }
  }

  pdf.save(filename);
}

// ─── Cover Page ────────────────────────────────────────────────────────────────
function drawCoverPage(
  pdf: jsPDF,
  pdfW: number, pdfH: number,
  quarter: string,
  date: string,
  location: string,
) {
  // Navy blue background
  pdf.setFillColor(27, 54, 93);
  pdf.rect(0, 0, pdfW, pdfH, 'F');

  // Gold top bar
  pdf.setFillColor(255, 215, 0);
  pdf.rect(0, 0, pdfW, 10, 'F');

  // Gold bottom bar
  pdf.rect(0, pdfH - 10, pdfW, 10, 'F');

  // Thin gold side lines
  pdf.setFillColor(255, 215, 0);
  pdf.rect(0, 10, 4, pdfH - 20, 'F');
  pdf.rect(pdfW - 4, 10, 4, pdfH - 20, 'F');

  // Decorative circle element (DepEd sun style)
  pdf.setDrawColor(255, 215, 0);
  pdf.setLineWidth(1.5);
  pdf.circle(pdfW / 2, 80, 28);
  pdf.setLineWidth(0.8);
  pdf.circle(pdfW / 2, 80, 22);

  // Sun rays
  const rays = 12;
  for (let i = 0; i < rays; i++) {
    const angle = (i / rays) * Math.PI * 2;
    const r1 = 25, r2 = 32;
    pdf.line(
      pdfW / 2 + Math.cos(angle) * r1, 80 + Math.sin(angle) * r1,
      pdfW / 2 + Math.cos(angle) * r2, 80 + Math.sin(angle) * r2,
    );
  }

  // DepEd header text
  pdf.setTextColor(255, 215, 0);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.text('DEPARTMENT OF EDUCATION', pdfW / 2, 130, { align: 'center' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.setTextColor(180, 200, 235);
  pdf.text('Region IX – Zamboanga Peninsula', pdfW / 2, 148, { align: 'center' });

  // Horizontal rule
  pdf.setDrawColor(255, 215, 0);
  pdf.setLineWidth(1.2);
  pdf.line(pdfW / 2 - 120, 165, pdfW / 2 + 120, 165);

  // Main title "PIR REVIEW"
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(52);
  pdf.setTextColor(255, 255, 255);
  pdf.text('PIR REVIEW', pdfW / 2, pdfH / 2 - 15, { align: 'center' });

  // Quarter badge background
  const quarterLabel = formatQuarterLabel(quarter);

  // Centre gold pill for quarter
  const pillW = 260, pillH = 44;
  const pillX = pdfW / 2 - pillW / 2;
  const pillY = pdfH / 2 + 5;
  pdf.setFillColor(255, 215, 0);
  roundedRect(pdf, pillX, pillY, pillW, pillH, 8);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.setTextColor(27, 54, 93);
  pdf.text(quarterLabel, pdfW / 2, pillY + 28, { align: 'center' });

  // Horizontal rule below quarter
  pdf.setDrawColor(255, 215, 0);
  pdf.setLineWidth(0.8);
  pdf.line(pdfW / 2 - 120, pdfH / 2 + 68, pdfW / 2 + 120, pdfH / 2 + 68);

  // Date and location
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.setTextColor(200, 220, 255);
  let infoY = pdfH / 2 + 90;

  if (date) {
    const formatted = formatDate(date);
    pdf.text(`📅  ${formatted}`, pdfW / 2, infoY, { align: 'center' });
    infoY += 20;
  }
  if (location) {
    pdf.text(`📍  ${location}`, pdfW / 2, infoY, { align: 'center' });
  }

  // Footer credit
  pdf.setFontSize(7.5);
  pdf.setTextColor(130, 155, 190);
  pdf.text('Generated by Project HAYAG — DepEd Region IX Automated Monitoring Tool', pdfW / 2, pdfH - 20, { align: 'center' });
}

// ─── Outline / Agenda Page ─────────────────────────────────────────────────────
function drawOutlinePage(pdf: jsPDF, pdfW: number, pdfH: number, items: string[]) {
  // White background
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pdfW, pdfH, 'F');

  // Navy header bar
  pdf.setFillColor(27, 54, 93);
  pdf.rect(0, 0, pdfW, 58, 'F');

  // Gold accent underline
  pdf.setFillColor(255, 215, 0);
  pdf.rect(0, 58, pdfW, 4, 'F');

  // Header text
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(22);
  pdf.setTextColor(255, 255, 255);
  pdf.text('AGENDA / OUTLINE', pdfW / 2, 40, { align: 'center' });

  // Subtitle
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(255, 215, 0);
  pdf.text('Department of Education Region IX — PIR Review', pdfW / 2, 54, { align: 'center' });

  // Items
  let y = 92;
  const colW = (pdfW - 120) / 2;
  const itemsPerCol = Math.ceil(items.length / 2);

  items.forEach((item, index) => {
    const col   = index < itemsPerCol ? 0 : 1;
    const row   = index < itemsPerCol ? index : index - itemsPerCol;
    const itemX = 60 + col * (colW + 40);
    const itemY = y + row * 54;

    // Number circle
    pdf.setFillColor(27, 54, 93);
    pdf.circle(itemX + 14, itemY, 12, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(255, 255, 255);
    pdf.text(`${index + 1}`, itemX + 14, itemY + 3.5, { align: 'center' });

    // Item text
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(12);
    pdf.setTextColor(27, 54, 93);
    const lines = pdf.splitTextToSize(item, colW - 35);
    pdf.text(lines, itemX + 32, itemY + 4);

    // Gold separator line
    pdf.setDrawColor(255, 215, 0);
    pdf.setLineWidth(0.4);
    pdf.line(itemX + 32, itemY + 14, itemX + colW - 5, itemY + 14);
  });

  // Footer
  pdf.setFontSize(7.5);
  pdf.setTextColor(160);
  pdf.text('DepEd Region IX | Project HAYAG', MARGIN, pdfH - 15);
  pdf.text('Page 2', pdfW - MARGIN - 30, pdfH - 15);
}

// ─── Auto-fit single-page slide ────────────────────────────────────────────────
function drawAutoFitSlide(
  pdf: jsPDF,
  fullCanvas: HTMLCanvasElement,
  pdfW: number, pdfH: number,
  ratio: number,
  totalCssPx: number,
  maxPx: number,
) {
  const shrink    = maxPx / totalCssPx;    // < 1 — scale factor
  const destW     = pdfW - 2 * MARGIN;
  const destH     = totalCssPx * ratio * shrink;

  pdf.addImage(
    fullCanvas.toDataURL('image/png'),
    'PNG', MARGIN, MARGIN, destW, destH,
    undefined, 'FAST'
  );
}

// ─── Multi-page slide rendering ────────────────────────────────────────────────
async function renderSlideMultiPage(
  pdf: jsPDF,
  fullCanvas: HTMLCanvasElement,
  headerCanvas: HTMLCanvasElement | null,
  scaledHeaderHPt: number,
  ratio: number,
  pdfW: number, pdfH: number,
  totalCssPx: number,
  rowBounds: Array<{ top: number; bottom: number }>,
  filename: string,
) {
  // Calculate how much CSS space fits per page
  const page1MaxPx = (pdfH - 2 * MARGIN - FOOTER_H) / ratio;
  const contMaxPx  = (pdfH - 2 * MARGIN - scaledHeaderHPt - FOOTER_H) / ratio;
  const destW      = pdfW - 2 * MARGIN;

  // ── Page 1 of this slide (full canvas from Y=0, header is part of slide) ─────
  let pageNum  = 1;
  const page1SplitPx = findSplit(rowBounds, 0, page1MaxPx, totalCssPx);

  drawPageFooter(pdf, pdfW, pdfH, MARGIN, filename, pageNum);
  drawSlice(pdf, fullCanvas, 0, page1SplitPx, SCALE, MARGIN, MARGIN, ratio, destW);

  let currentPx = page1SplitPx;
  pageNum++;

  // ── Subsequent pages ─────────────────────────────────────────────────────────
  while (currentPx < totalCssPx - 1) {
    pdf.addPage();
    drawPageFooter(pdf, pdfW, pdfH, MARGIN, filename, pageNum);

    // Repeating header
    if (headerCanvas) {
      pdf.addImage(
        headerCanvas.toDataURL('image/png'),
        'PNG', MARGIN, MARGIN, destW, scaledHeaderHPt,
        undefined, 'FAST'
      );
    }

    const splitPx = findSplit(rowBounds, currentPx, currentPx + contMaxPx, totalCssPx);
    const bodyY   = MARGIN + scaledHeaderHPt;

    drawSlice(pdf, fullCanvas, currentPx, splitPx, SCALE, MARGIN, bodyY, ratio, destW);

    currentPx = splitPx;
    pageNum++;
    if (currentPx >= totalCssPx - 1) break;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function findSplit(
  rowBounds: Array<{ top: number; bottom: number }>,
  currentPx: number,
  maxEndPx: number,
  totalPx: number,
): number {
  let split = Math.min(maxEndPx, totalPx);
  for (const rb of rowBounds) {
    if (rb.top >= currentPx && rb.bottom <= maxEndPx) {
      split = rb.bottom;
    }
  }
  if (split <= currentPx) split = Math.min(maxEndPx, totalPx);
  return split;
}

function getOffsetFromAncestor(el: HTMLElement, ancestor: HTMLElement): number {
  let offset = 0;
  let cur: HTMLElement | null = el;
  while (cur && cur !== ancestor) {
    offset += cur.offsetTop;
    cur = cur.offsetParent as HTMLElement | null;
  }
  return offset;
}

function drawSlice(
  pdf: jsPDF,
  canvas: HTMLCanvasElement,
  startPx: number, endPx: number,
  scale: number,
  marginX: number, destY: number,
  ratio: number, destW: number,
) {
  const startC = startPx * scale;
  const sliceH = (endPx - startPx) * scale;
  if (sliceH <= 0) return;

  const slice = document.createElement('canvas');
  slice.width  = canvas.width;
  slice.height = sliceH;
  const ctx = slice.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, slice.width, sliceH);
  ctx.drawImage(canvas, 0, startC, canvas.width, sliceH, 0, 0, canvas.width, sliceH);

  const destH = (sliceH / scale) * ratio;
  pdf.addImage(slice.toDataURL('image/png'), 'PNG', marginX, destY, destW, destH, undefined, 'FAST');
}

function drawPageFooter(
  pdf: jsPDF, pdfW: number, pdfH: number,
  margin: number, filename: string, pageNum: number,
) {
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.4);
  pdf.line(margin, pdfH - margin, pdfW - margin, pdfH - margin);

  pdf.setFontSize(7.5);
  pdf.setTextColor(160);
  pdf.text(`DepEd Region IX | Project HAYAG | ${filename}`, margin, pdfH - margin + 10);
  pdf.text(`Page ${pageNum}`, pdfW - margin - 30, pdfH - margin + 10);
  pdf.setTextColor(0);
}

function formatQuarterLabel(q: string): string {
  const map: Record<string, string> = {
    Q1: 'FIRST QUARTER', Q2: 'SECOND QUARTER',
    Q3: 'THIRD QUARTER',  Q4: 'FOURTH QUARTER',
    'First Quarter':  'FIRST QUARTER',
    'Second Quarter': 'SECOND QUARTER',
    'Third Quarter':  'THIRD QUARTER',
    'Fourth Quarter': 'FOURTH QUARTER',
  };
  return map[q] ?? q.toUpperCase();
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-PH', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/** Draw a filled rounded rectangle. jsPDF doesn't have roundedRect built-in for fills. */
function roundedRect(pdf: jsPDF, x: number, y: number, w: number, h: number, r: number) {
  const k = r * (4 / 3) * (Math.sqrt(2) - 1);
  pdf.moveTo(x + r, y);
  pdf.lineTo(x + w - r, y);
  pdf.curveTo(x + w - r + k, y, x + w, y + r - k, x + w, y + r);
  pdf.lineTo(x + w, y + h - r);
  pdf.curveTo(x + w, y + h - r + k, x + w - r + k, y + h, x + w - r, y + h);
  pdf.lineTo(x + r, y + h);
  pdf.curveTo(x + r - k, y + h, x, y + h - r + k, x, y + h - r);
  pdf.lineTo(x, y + r);
  pdf.curveTo(x, y + r - k, x + r - k, y, x + r, y);
  pdf.close();
  pdf.fill();
}
