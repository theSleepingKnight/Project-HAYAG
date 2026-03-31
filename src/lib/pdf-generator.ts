import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';

// ─── Constants ─────────────────────────────────────────────────────────────────
const A4_W_PX  = 1122;   // A4 landscape at 96 DPI (841.89pt × 96/72)
const SCALE    = 1.5;    // Capture scale for crisp rendering
const MARGIN   = 30;     // PDF point margin
const FOOTER_H = 22;     // PDF points reserved for footer

// ─── Public interface ───────────────────────────────────────────────────────────
export interface PdfOptions {
  filename:     string;
  quarter:      string;           // Q1, Q2, etc.
  date:         string;           // YYYY-MM-DD
  location:     string;
  outlineItems: string[];         // Agenda list
}

async function loadImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

// ─── Main Entry Point ───────────────────────────────────────────────────────────
export async function generateHAYAGPdf(
  hiddenContainerId: string,
  options: PdfOptions
) {
  const container = document.getElementById(hiddenContainerId);
  if (!container) return;

  const { filename: rawFilename, quarter, date, location, outlineItems } = options;
  const filename = rawFilename.replace(/\s+/g, '_');

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pdfW = pdf.internal.pageSize.getWidth();   // 841.89 pt
  const pdfH = pdf.internal.pageSize.getHeight();  // 595.28 pt
  const ratio = (pdfW - 2 * MARGIN) / A4_W_PX;

  // 1. Cover
  let logoBase64 = '';
  try {
    logoBase64 = await loadImageAsBase64('/deped-region9.png');
  } catch (e) {
    console.warn('Could not load logo:', e);
  }
  drawCoverPage(pdf, pdfW, pdfH, quarter, date, location, logoBase64);

  // 2. Agenda
  if (outlineItems.length > 0) {
    pdf.addPage();
    drawOutlinePage(pdf, pdfW, pdfH, outlineItems);
  }

  // 3. Slides
  const slides = Array.from(container.children) as HTMLElement[];
  for (const slide of slides) {
    const thead = slide.querySelector('thead') as HTMLElement | null;
    const tbody = slide.querySelector('tbody') as HTMLElement | null;

    let hOffsetPx = 0, hHeightPx = 0;
    if (thead) {
      hOffsetPx = getOffsetFromAncestor(thead, slide);
      hHeightPx = thead.offsetHeight;
    }
    const scaledHPt = hHeightPx * ratio;

    const fullCanvas = await html2canvas(slide, {
      scale: SCALE, useCORS: true, backgroundColor: '#ffffff',
      width: A4_W_PX, windowWidth: A4_W_PX,
    });

    const totalCssPx = fullCanvas.height / SCALE;
    const allRows  = tbody ? Array.from(tbody.querySelectorAll('tr')) as HTMLElement[] : [];
    const rowBounds = allRows.map(r => ({
      top:    getOffsetFromAncestor(r, slide),
      bottom: getOffsetFromAncestor(r, slide) + r.offsetHeight,
    }));

    const p1MaxPx = (pdfH - 2 * MARGIN - FOOTER_H) / ratio;
    pdf.addPage();

    // Data rendering
    if (totalCssPx <= p1MaxPx * 1.4 && totalCssPx > p1MaxPx) {
      drawAutoFitSlide(pdf, fullCanvas, pdfW, pdfH, ratio, totalCssPx, p1MaxPx);
    } else {
      await renderSlideMultiPage(
        pdf, fullCanvas, hOffsetPx, hHeightPx, scaledHPt, ratio,
        pdfW, pdfH, totalCssPx, rowBounds, filename
      );
    }
  }

  // 4. Thank You Page
  pdf.addPage();
  drawThankYouPage(pdf, pdfW, pdfH, logoBase64);


  const blob = pdf.output('blob');
  saveAs(blob, filename);
}

// ─── Thank You Page ─────────────────────────────────────────────────────────────
function drawThankYouPage(
  pdf: jsPDF, pdfW: number, pdfH: number, logo?: string
) {
  pdf.setFillColor(27, 54, 93); // Navy
  pdf.rect(0, 0, pdfW, pdfH, 'F');

  // Gold side pillars
  pdf.setFillColor(255, 215, 0);
  pdf.rect(0, 0, 15, pdfH, 'F');
  pdf.rect(pdfW - 15, 0, 15, pdfH, 'F');

  const centerX = pdfW / 2;
  
  if (logo) {
    pdf.addImage(logo, 'PNG', centerX - 60, 45, 120, 120);
  }

  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(28); 
  pdf.text('DEPARTMENT OF EDUCATION', centerX, 195, { align: 'center' });

  pdf.setTextColor(255, 215, 0); // Gold
  pdf.setFontSize(20); 
  pdf.text('Region IX – Zamboanga Peninsula', centerX, 222, { align: 'center' });

  const boxW = 480, boxH = 90;
  pdf.setFillColor(255, 215, 0);
  roundedRect(pdf, centerX - boxW / 2, 260, boxW, boxH, 12);
  
  pdf.setTextColor(27, 54, 93);
  pdf.setFontSize(54);
  pdf.text('Thank you', centerX, 322, { align: 'center' });
}

// ─── Cover Page ────────────────────────────────────────────────────────────────
function drawCoverPage(
  pdf: jsPDF, pdfW: number, pdfH: number,
  quarter: string, date: string, location: string, logo?: string
) {
  pdf.setFillColor(27, 54, 93); // Navy
  pdf.rect(0, 0, pdfW, pdfH, 'F');

  // Gold side pillars
  pdf.setFillColor(255, 215, 0);
  pdf.rect(0, 0, 15, pdfH, 'F');
  pdf.rect(pdfW - 15, 0, 15, pdfH, 'F');

  const centerX = pdfW / 2;
  
  if (logo) {
    pdf.addImage(logo, 'PNG', centerX - 60, 45, 120, 120);
  }

  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(28); 
  pdf.text('DEPARTMENT OF EDUCATION', centerX, 195, { align: 'center' });

  pdf.setTextColor(255, 215, 0); // Gold
  pdf.setFontSize(20); 
  pdf.text('Region IX – Zamboanga Peninsula', centerX, 222, { align: 'center' });

  const boxW = 480, boxH = 90;
  pdf.setFillColor(255, 215, 0);
  roundedRect(pdf, centerX - boxW / 2, 260, boxW, boxH, 12);
  
  pdf.setTextColor(27, 54, 93);
  pdf.setFontSize(54);
  pdf.text('PIR REVIEW', centerX, 322, { align: 'center' });

  const qName = formatQuarterLabel(quarter);
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(32);
  pdf.text(qName, centerX, 395, { align: 'center' });

  pdf.setFontSize(14);
  pdf.setTextColor(200, 225, 255);
  let infoY = 435;
  
  if (date) {
    const formatted = robustDate(date);
    pdf.text(`Date: ${formatted}`, centerX, infoY, { align: 'center' });
    infoY += 28;
  }
  if (location) {
    pdf.text(`Location: ${location}`, centerX, infoY, { align: 'center' });
  }

  // 7. Footer text removed
}

// ─── Outline / Agenda Page ─────────────────────────────────────────────────────
function drawOutlinePage(pdf: jsPDF, pdfW: number, pdfH: number, items: string[]) {
  pdf.setFillColor(27, 54, 93);
  pdf.rect(0, 0, pdfW, 70, 'F');
  pdf.setFillColor(255, 215, 0);
  pdf.rect(0, 70, pdfW, 6, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(32);
  pdf.text('REPORT AGENDA', pdfW / 2, 50, { align: 'center' });

  let y = 120;
  items.forEach((item, index) => {
    const lines = item.split(/\n/);
    lines.forEach((line, li) => {
      const isSub = line.trim().startsWith('-') || line.trim().startsWith('*');
      if (isSub) {
        pdf.setTextColor(80, 100, 150);
        pdf.setFontSize(18);
        pdf.text(`   •  ${line.trim().substring(1).trim()}`, 80, y);
      } else {
        pdf.setTextColor(27, 54, 93);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(22);
        pdf.text(`${li === 0 ? index + 1 + '. ' : ''}${line.trim()}`, 60, y);
      }
      y += 35;
    });
    y += 15;
  });

  pdf.setFontSize(9);
  pdf.setTextColor(160);
}

// ─── Rendering Core ────────────────────────────────────────────────────────────
async function renderSlideMultiPage(
  pdf: jsPDF, full: HTMLCanvasElement, 
  hOff: number, hH: number, hPt: number, rat: number,
  pdfW: number, pdfH: number, cssH: number,
  rb: Array<{top:number, bottom:number}>, fn: string
) {
  const p1Max = (pdfH - 2 * MARGIN - FOOTER_H) / rat;
  const cMax  = (pdfH - 2 * MARGIN - hPt - FOOTER_H) / rat;
  const dW    = pdfW - 2 * MARGIN;

  let pageNum = 1;
  const p1Split = findSplit(rb, 0, p1Max, cssH);
    
  drawPageFooter(pdf, pdfW, pdfH, MARGIN, fn, pageNum);
  const destH1 = drawSlice(pdf, full, 0, p1Split, SCALE, MARGIN, MARGIN, rat, dW);
  drawThickBottomBorder(pdf, MARGIN, MARGIN + destH1, dW);

  let cur = p1Split;
  pageNum++;

  while (cur < cssH - 5) {
    const remaining = rb.filter(r => r.top >= cur);
    if (remaining.length === 0) break;

    const split = findSplit(rb, cur, cur + cMax, cssH);
    if (split <= cur + 1) break;

    pdf.addPage();
    drawPageFooter(pdf, pdfW, pdfH, MARGIN, fn, pageNum);

    if (hH > 0) {
      drawSlice(pdf, full, hOff, hOff + hH, SCALE, MARGIN, MARGIN, rat, dW);
    }
    const destH2 = drawSlice(pdf, full, cur, split, SCALE, MARGIN, MARGIN + hPt, rat, dW);
    drawThickBottomBorder(pdf, MARGIN, MARGIN + hPt + destH2, dW);
    
    cur = split;
    pageNum++;
  }
}

function drawAutoFitSlide(pdf: jsPDF, can: HTMLCanvasElement, pw:number, ph:number, rat:number, ch:number, mp:number) {
  const sh = mp / ch;
  const destH = ch * rat * sh;
  const dw = pw - 2*MARGIN;
  pdf.addImage(can.toDataURL('image/png'), 'PNG', MARGIN, MARGIN, dw, destH, undefined, 'FAST');
  drawThickBottomBorder(pdf, MARGIN, MARGIN + destH, dw);
}

function drawThickBottomBorder(pdf: jsPDF, x: number, y: number, w: number) {
  pdf.setDrawColor(27, 54, 93); // DepEd Navy
  pdf.setLineWidth(2.5);         // Thick border
  pdf.line(x, y, x + w, y);
}

function findSplit(rb: Array<{top:number, bottom:number}>, cur: number, max: number, tot: number) {
  let s = Math.min(max, tot);
  for (const r of rb) if (r.top >= cur && r.bottom <= max) s = r.bottom;
  if (s <= cur) s = Math.min(max, tot);
  return s;
}

function getOffsetFromAncestor(el: HTMLElement, anc: HTMLElement) {
  let o = 0, c: HTMLElement | null = el;
  while (c && c !== anc) { o += c.offsetTop; c = c.offsetParent as HTMLElement | null; }
  return o;
}

function drawSlice(pdf: jsPDF, can: HTMLCanvasElement, s: number, e: number, sc: number, mx: number, dy: number, rat: number, dw: number): number {
  const sHz = (e - s) * sc; 
  if (sHz <= 0) return 0;
  const slice = document.createElement('canvas'); slice.width = can.width; slice.height = sHz;
  const ctx = slice.getContext('2d'); if (!ctx) return 0;
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, slice.width, sHz);
  ctx.drawImage(can, 0, s * sc, can.width, sHz, 0, 0, can.width, sHz);
  const destH = (sHz/sc)*rat;
  pdf.addImage(slice.toDataURL('image/png'), 'PNG', mx, dy, dw, destH, undefined, 'FAST');
  return destH;
}

function drawPageFooter(pdf: jsPDF, pw: number, ph: number, m: number, fn: string, pn: number) {
  pdf.setDrawColor(200); pdf.setLineWidth(0.4);
  pdf.line(m, ph - m, pw - m, ph - m);
  pdf.setFontSize(7.5); pdf.setTextColor(160);
  pdf.text(`Page ${pn}`, pw - m - 30, ph - m + 10);
}

function robustDate(ds: string) {
  if (!ds) return '';
  const d = new Date(ds + 'T00:00:00');
  if (isNaN(d.getTime())) return ds; 
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatQuarterLabel(q: string) {
  const qNum = q.match(/\d/)?.[0] || '1';
  const ordinals: Record<string, string> = { '1': '1st', '2': '2nd', '3': '3rd', '4': '4th' };
  return `${ordinals[qNum] || qNum} Quarter`;
}

function roundedRect(pdf: jsPDF, x: number, y: number, w: number, h: number, r: number) {
  const k = r * (4/3) * (Math.sqrt(2) - 1);
  pdf.moveTo(x + r, y); pdf.lineTo(x + w - r, y);
  pdf.curveTo(x + w - r + k, y, x + w, y + r - k, x + w, y + r);
  pdf.lineTo(x + w, y + h - r);
  pdf.curveTo(x + w, y + h - r + k, x + w - r + k, y + h, x + w - r, y + h);
  pdf.lineTo(x + r, y + h); pdf.curveTo(x + r - k, y + h, x, y + h - r + k, x, y + h - r);
  pdf.lineTo(x, y + r); pdf.curveTo(x, y + r - k, x + r - k, y, x + r, y);
  pdf.close(); pdf.fill();
}
