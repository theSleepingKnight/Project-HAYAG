'use client'

import { useState, useCallback } from 'react';
import styles from './page.module.css';
import SdoGrouping from '@/components/SdoGrouping';
import GeneratorOptions from '@/components/GeneratorOptions';
import SlidePreview from '@/components/SlidePreview';
import DownloadModal, { PdfFormData } from '@/components/DownloadModal';
import { detectSheetFeatures, fetchSheetData } from './actions';
import { buildMockReportFromCoordinates, extractRealSheetData } from '@/lib/data-engine-real';
import { mapToSlides, SlideData } from '@/lib/slide-mapper';
import { generateHAYAGPdf } from '@/lib/pdf-generator';
import { ProgramSection } from '@/lib/data-engine';

type SectionKey = 'prexc' | 'nonPrexc';

interface SheetInfo {
  spreadsheetId: string;
  foundSheets: { prexc: string | null; nonPrexc: string | null };
}

export default function Home() {
  const [sheetLink, setSheetLink] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [detectionMessage, setDetectionMessage] = useState('');
  const [sheetInfo, setSheetInfo] = useState<SheetInfo | null>(null);

  const [currentGroups, setCurrentGroups] = useState<Record<string, string[]>>({});
  const [activeSection, setActiveSection] = useState<SectionKey>('prexc');
  const [programSections, setProgramSections] = useState<ProgramSection[]>([]);

  // One slide array per SDO group  
  const [groupSlides, setGroupSlides] = useState<Record<string, SlideData[]>>({});
  const [selectedTemplate, setSelectedTemplate] = useState<'Formal' | 'Presentation'>('Formal');
  const [exportingGroup, setExportingGroup] = useState<string | null>(null);

  // Download modal state
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [pendingDownload, setPendingDownload] = useState<{ groupName: string; quarter: string } | null>(null);

  // ── Build slides for each group ──────────────────────────────────────────────
  const rebuildSlides = useCallback(
    (programs: ProgramSection[], groups: Record<string, string[]>, quarter: string, sectionLabel: string) => {
      const newGroupSlides: Record<string, SlideData[]> = {};
      for (const [groupName, sdos] of Object.entries(groups)) {
        if (sdos.length === 0) continue;
        newGroupSlides[groupName] = mapToSlides(
          programs,
          { [groupName]: sdos },
          quarter,
          sectionLabel,
        );
      }
      setGroupSlides(newGroupSlides);
    },
    []
  );

  // ── Load sheet data from API ─────────────────────────────────────────────────
  const loadSectionData = useCallback(
    async (info: SheetInfo, section: SectionKey, groups: Record<string, string[]>, quarter: string) => {
      const tabName = section === 'prexc' ? info.foundSheets.prexc : info.foundSheets.nonPrexc;
      const sectionLabel = section === 'prexc'
        ? 'PREXC (PROGRAM EXPENDITURE CLASSIFICATION)'
        : 'NON-PREXC';

      if (!tabName) {
        // Fall back to mock data for sections not found
        const mock = buildMockReportFromCoordinates();
        setProgramSections(mock);
        rebuildSlides(mock, groups, quarter, sectionLabel);
        return;
      }

      setIsLoadingData(true);
      try {
        const result = await fetchSheetData(info.spreadsheetId, tabName);
        if (result.success && result.data.length > 0) {
          const extracted = extractRealSheetData(result.data as unknown[][]);
          setProgramSections(extracted);
          rebuildSlides(extracted, groups, quarter, sectionLabel);
        } else {
          // Fall back to mock
          console.warn('Sheet fetch failed, using mock data:', result.message);
          const mock = buildMockReportFromCoordinates();
          setProgramSections(mock);
          rebuildSlides(mock, groups, quarter, sectionLabel);
        }
      } finally {
        setIsLoadingData(false);
      }
    },
    [rebuildSlides]
  );

  // ── Step 1: Detect sheet ─────────────────────────────────────────────────────
  const handleBeginExtraction = async () => {
    if (!sheetLink) {
      alert('Please paste a Google Sheet link first!');
      return;
    }
    setIsDetecting(true);
    setDetectionMessage('');
    try {
      const result = await detectSheetFeatures(sheetLink);
      if (result.success && result.spreadsheetId) {
        setDetectionMessage(result.message);
        setSheetInfo({ spreadsheetId: result.spreadsheetId, foundSheets: result.foundSheets });
        setShowConfig(true);
      } else {
        alert(result.message);
      }
    } catch (err) {
      console.error(err);
      alert('Error scanning spreadsheet.');
    } finally {
      setIsDetecting(false);
    }
  };

  // ── SDO groups changed ───────────────────────────────────────────────────────
  const handleGroupsChange = useCallback(
    (groups: Record<string, string[]>) => {
      setCurrentGroups(groups);
      if (sheetInfo) {
        loadSectionData(sheetInfo, activeSection, groups, 'Q1');
      }
    },
    [sheetInfo, activeSection, loadSectionData]
  );

  // ── Section switched (PREXC ↔ NON-PREXC) ────────────────────────────────────
  const handleSectionChange = useCallback(
    (section: SectionKey) => {
      setActiveSection(section);
      if (sheetInfo && Object.keys(currentGroups).length > 0) {
        loadSectionData(sheetInfo, section, currentGroups, 'Q1');
      }
    },
    [sheetInfo, currentGroups, loadSectionData]
  );

  // ── Generate / export ────────────────────────────────────────────────────────
  const handleGeneratePreview = useCallback(
    async (format: 'pdf' | 'slides', options: { quarter: string; template: string }) => {
      setSelectedTemplate(options.template as 'Formal' | 'Presentation');

      if (!sheetInfo) return;

      const sectionLabel = activeSection === 'prexc'
        ? 'PREXC (PROGRAM EXPENDITURE CLASSIFICATION)'
        : 'NON-PREXC';

      const newGroupSlides: Record<string, SlideData[]> = {};
      for (const [groupName, sdos] of Object.entries(currentGroups)) {
        if (sdos.length === 0) continue;
        newGroupSlides[groupName] = mapToSlides(
          programSections,
          { [groupName]: sdos },
          options.quarter,
          sectionLabel,
        );
      }
      setGroupSlides(newGroupSlides);

      if (format === 'slides') {
        alert('Google Slides export coming next!');
      }
      // PDF download is handled per-group by per-group buttons
    },
    [sheetInfo, activeSection, currentGroups, programSections]
  );

  // ── Per-group PDF download: show modal first ──────────────────────────────────────────
  const handleGroupDownload = useCallback(
    (groupName: string, quarter: string) => {
      setPendingDownload({ groupName, quarter });
      setShowDownloadModal(true);
    },
    []
  );

  // ── Modal confirmed: run the actual PDF generation ───────────────────────────────
  const handleModalConfirm = useCallback(
    async (formData: PdfFormData) => {
      setShowDownloadModal(false);
      if (!pendingDownload) return;

      const { groupName, quarter } = pendingDownload;
      const containerId = `pdf-hidden-${groupName.toLowerCase().replace(/\s+/g, '-')}`;
      const sectionTag  = activeSection === 'prexc' ? 'PREXC' : 'NON-PREXC';

      setExportingGroup(groupName);
      await new Promise((r) => setTimeout(r, 400));
      await generateHAYAGPdf(containerId, {
        filename:     `HAYAG-${sectionTag}-${groupName}-${quarter}.pdf`,
        quarter,
        date:         formData.date,
        location:     formData.location,
        outlineItems: formData.outlineItems,
      });
      setExportingGroup(null);
      setPendingDownload(null);
    },
    [activeSection, pendingDownload]
  );

  const activeGroups = Object.entries(currentGroups).filter(([, sdos]) => sdos.length > 0);

  return (
    <main className={styles.dashboard}>

      {/* ── Download Modal (shown before PDF generation) ── */}
      <DownloadModal
        isOpen={showDownloadModal}
        groupName={pendingDownload?.groupName ?? ''}
        quarter={pendingDownload?.quarter ?? 'Q1'}
        onConfirm={handleModalConfirm}
        onCancel={() => { setShowDownloadModal(false); setPendingDownload(null); }}
      />

      {/* ── Hero Card ── */}
      <div className={styles.card}>
        <div className={styles.logoArea}>
          <div className={styles.divider}></div>
          <span>DEPED REGION IX</span>
          <div className={styles.divider}></div>
        </div>
        <h1 className={styles.title}>Project HAYAG</h1>
        <p className={styles.subtitle}>Automated SDO Monitoring & Presentation Generator</p>

        <div className={styles.inputGroup}>
          <input
            type="text"
            className={styles.inputField}
            placeholder="Paste Google Sheet Link..."
            value={sheetLink}
            onChange={(e) => setSheetLink(e.target.value)}
          />
        </div>

        <button
          className={styles.actionButton}
          onClick={handleBeginExtraction}
          disabled={isDetecting}
        >
          {isDetecting ? 'Scanning Sheets...' : 'Begin Extraction'}
        </button>

        {detectionMessage && (
          <div style={{
            marginTop: '1.5rem', padding: '1rem',
            background: '#F0FDF4', color: '#166534',
            borderRadius: '8px', fontSize: '0.8rem',
          }}>
            {detectionMessage}
          </div>
        )}
      </div>

      {/* ── Configuration & Preview ── */}
      {showConfig && sheetInfo && (
        <>
          <SdoGrouping onGroupsChange={handleGroupsChange} />

          <GeneratorOptions
            availableSections={sheetInfo.foundSheets}
            onSectionChange={handleSectionChange}
            onGenerate={handleGeneratePreview}
          />

          {/* ── Per-group preview + download buttons ── */}
          {activeGroups.length > 0 && (
            <div style={{ marginTop: '3rem', width: '100%', maxWidth: '1200px' }}>
              <h3 style={{
                marginBottom: '1.5rem', color: '#1B365D',
                textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.05em',
              }}>
                {isLoadingData
                  ? '⏳ Loading live sheet data...'
                  : '👀 Comparison Table Preview — One Card Per Group'}
              </h3>

              {activeGroups.map(([groupName]) => {
                const slides = groupSlides[groupName] ?? [];
                const containerId = `pdf-hidden-${groupName.toLowerCase().replace(/\s+/g, '-')}`;
                const isExporting = exportingGroup === groupName;

                return (
                  <div key={groupName} className={styles.groupBlock}>
                    {/* Group header + download button */}
                    <div className={styles.groupHeader}>
                      <span className={styles.groupTitle}>
                        {groupName}
                        <span className={styles.groupCount}>
                          {currentGroups[groupName].length} SDOs
                        </span>
                      </span>
                      <button
                        className={`${styles.groupDownloadBtn} ${isExporting ? styles.groupDownloadBusy : ''}`}
                        onClick={() => handleGroupDownload(groupName, 'Q1')}
                        disabled={isExporting || slides.length === 0}
                      >
                        {isExporting ? '⏳ Generating...' : `⬇ Download ${groupName} PDF`}
                      </button>
                    </div>

                    {/* Visible preview (zoomed) */}
                    <div className={styles.previewContainer}>
                      {slides.map((slide, i) => (
                        <SlidePreview key={i} slide={slide} template={selectedTemplate} />
                      ))}
                    </div>

                    {/* Hidden full-size container for PDF capture */}
                    <div id={containerId} className={styles.pdfHiddenContainer}>
                      {slides.map((slide, i) => (
                        <SlidePreview key={i} slide={slide} template={selectedTemplate} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </main>
  );
}
