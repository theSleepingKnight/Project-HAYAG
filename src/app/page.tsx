'use client'

import { useState, useCallback } from 'react';
import styles from './page.module.css';
import SdoGrouping from '@/components/SdoGrouping';
import GeneratorOptions from '@/components/GeneratorOptions';
import SlidePreview from '@/components/SlidePreview';
import DownloadModal, { PdfFormData } from '@/components/DownloadModal';
import { detectSheetFeatures, fetchSheetData } from './actions';
import { extractRealSheetData, buildMockReportFromCoordinates } from '@/lib/data-engine-real';
import { buildDynamicConfig } from '@/lib/data-engine';
import { mapToSlides, SlideData } from '@/lib/slide-mapper';
import { generateHAYAGPdf } from '@/lib/pdf-generator';
import { generateHAYAGPptx } from '@/lib/pptx-generator';
import { ProgramSection } from '@/lib/data-engine';

type SectionKey = 'prexc' | 'nonPrexc' | 'master';

interface SheetInfo {
  spreadsheetId: string;
  foundSheets: { prexc: string | null; nonPrexc: string | null };
}

export default function Home() {
  const [sheetLink, setSheetLink] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [sheetInfo, setSheetInfo] = useState<SheetInfo | null>(null);

  const [currentGroups, setCurrentGroups] = useState<Record<string, string[]>>({});
  const [activeSection, setActiveSection] = useState<SectionKey>('prexc');

  const [groupSlides, setGroupSlides] = useState<Record<string, SlideData[]>>({});
  const [exportingGroup, setExportingGroup] = useState<string | null>(null);

  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [pendingDownload, setPendingDownload] = useState<{ groupName: string; quarter: string; format: 'pdf' | 'pptx' } | null>(null);

  const rebuildSlides = useCallback(
    (batches: { progs: ProgramSection[]; label: string }[], groups: Record<string, string[]>, quarter: string) => {
      const newGroupSlides: Record<string, SlideData[]> = {};
      for (const [groupName, sdos] of Object.entries(groups)) {
        if (sdos.length === 0) continue;
        let groupFullSlides: SlideData[] = [];
        for (const batch of batches) {
          const batchSlides = mapToSlides(batch.progs, { [groupName]: sdos }, quarter, batch.label);
          groupFullSlides = [...groupFullSlides, ...batchSlides];
        }
        newGroupSlides[groupName] = groupFullSlides;
      }
      setGroupSlides(newGroupSlides);
    },
    []
  );

  const loadSectionData = useCallback(
    async (info: SheetInfo, section: SectionKey, groups: Record<string, string[]>, quarter: string) => {
      setIsLoadingData(true);
      try {
        if (section === 'master') {
          const [resPre, resNon] = await Promise.all([
            info.foundSheets.prexc ? fetchSheetData(info.spreadsheetId, info.foundSheets.prexc) : Promise.resolve({ success: false, data: [] }),
            info.foundSheets.nonPrexc ? fetchSheetData(info.spreadsheetId, info.foundSheets.nonPrexc) : Promise.resolve({ success: false, data: [] })
          ]);
          const pBatch = resPre.success && resPre.data.length > 0 ? extractRealSheetData(resPre.data as any, buildDynamicConfig(resPre.data as any, 'PREXC')) : [];
          const nBatch = resNon.success && resNon.data.length > 0 ? extractRealSheetData(resNon.data as any, buildDynamicConfig(resNon.data as any, info.foundSheets.nonPrexc!)) : [];

          rebuildSlides([
            { progs: pBatch, label: 'PREXC (PROGRAM EXPENDITURE CLASSIFICATION)' },
            { progs: nBatch, label: 'NON-PREXC (NON-PROGRAM EXPENDITURE)' }
          ], groups, quarter);
          return;
        }

        const tabName = section === 'prexc' ? info.foundSheets.prexc : info.foundSheets.nonPrexc;
        const sectionLabel = section === 'prexc' ? 'PREXC (PROGRAM EXPENDITURE CLASSIFICATION)' : 'NON-PREXC';
        if (!tabName) {
          const mock = buildMockReportFromCoordinates();
          rebuildSlides([{ progs: mock, label: sectionLabel }], groups, quarter);
          return;
        }
        const result = await fetchSheetData(info.spreadsheetId, tabName);
        if (result.success && result.data.length > 0) {
          const config = buildDynamicConfig(result.data as any, tabName);
          const extracted = extractRealSheetData(result.data as any, config);
          rebuildSlides([{ progs: extracted, label: sectionLabel }], groups, quarter);
        }
      } finally {
        setIsLoadingData(false);
      }
    },
    [rebuildSlides]
  );

  const handleBeginExtraction = async () => {
    if (!sheetLink) return;
    setIsDetecting(true);
    try {
      const result = await detectSheetFeatures(sheetLink);
      if (result.success && result.spreadsheetId) {
        setSheetInfo({ spreadsheetId: result.spreadsheetId, foundSheets: result.foundSheets });
        setShowConfig(true);
      }
    } finally {
      setIsDetecting(false);
    }
  };

  const handleGroupsChange = useCallback((groups: Record<string, string[]>) => {
    setCurrentGroups(groups);
    if (sheetInfo) loadSectionData(sheetInfo, activeSection, groups, 'Q1');
  }, [sheetInfo, activeSection, loadSectionData]);

  const handleSectionChange = useCallback((section: SectionKey) => {
    setActiveSection(section);
    if (sheetInfo && Object.keys(currentGroups).length > 0) loadSectionData(sheetInfo, section, currentGroups, 'Q1');
  }, [sheetInfo, currentGroups, loadSectionData]);


  const handleGroupDownload = (groupName: string, quarter: string, format: 'pdf' | 'pptx' = 'pdf') => {
    setPendingDownload({ groupName, quarter, format });
    setShowDownloadModal(true);
  };

  const handleModalConfirm = async (formData: PdfFormData) => {
    setShowDownloadModal(false);
    if (!pendingDownload) return;
    const { groupName, quarter, format } = pendingDownload;
    const containerId = `pdf-hidden-${groupName.toLowerCase().replace(/\s+/g, '-')}`;
    setExportingGroup(groupName);
    
    // Brief delay to ensure modal is closed and UI is stable
    await new Promise(r => setTimeout(r, 400));
    
    const options = {
      filename: `Q${quarter.match(/\d/)?.[0]}_${activeSection.toUpperCase()}_${groupName.replace(/\s+/g, '_')}.${format}`,
      quarter,
      date: formData.date,
      location: formData.location,
      outlineItems: formData.outlineItems,
    };

    if (format === 'pdf') {
      await generateHAYAGPdf(containerId, options);
    } else {
      const slides = groupSlides[groupName] || [];
      await generateHAYAGPptx(slides, options);
    }
    
    setExportingGroup(null);
    setPendingDownload(null);
  };

  const activeGroups = Object.entries(currentGroups).filter(([, sdos]) => sdos.length > 0);

  return (
    <main className={styles.dashboard}>
      <DownloadModal isOpen={showDownloadModal} groupName={pendingDownload?.groupName ?? ''} quarter={pendingDownload?.quarter ?? 'Q1'}
        onConfirm={handleModalConfirm} onCancel={() => { setShowDownloadModal(false); setPendingDownload(null); }} />
      <div className={styles.card}>
        <div className={styles.logoArea}><div className={styles.divider}></div><span>DEPED REGION IX</span><div className={styles.divider}></div></div>
        <h1 className={styles.title}>Project HAYAG</h1>
        <p className={styles.subtitle}>Automated SDO Monitoring & Presentation Generator</p>
        <div className={styles.inputGroup}><input type="text" className={styles.inputField} placeholder="Paste Google Sheet Link..." value={sheetLink} onChange={(e) => setSheetLink(e.target.value)} /></div>
        <button className={styles.actionButton} onClick={handleBeginExtraction} disabled={isDetecting}>{isDetecting ? 'Scanning Sheets...' : 'Begin Extraction'}</button>
      </div>
      {showConfig && sheetInfo && (
        <>
          <SdoGrouping onGroupsChange={handleGroupsChange} />
          <GeneratorOptions availableSections={sheetInfo.foundSheets} onSectionChange={handleSectionChange} />
          {activeGroups.length > 0 && (
            <div style={{ marginTop: '3rem', width: '100%', maxWidth: '1200px' }}>
              <h3 style={{ marginBottom: '1.5rem', color: '#1B365D', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.05em' }}>
                {isLoadingData ? '⏳ Loading live sheet data...' : '👀 Comparison Table Preview'}
              </h3>
              {activeGroups.map(([groupName]) => {
                const slides = groupSlides[groupName] ?? [];
                const containerId = `pdf-hidden-${groupName.toLowerCase().replace(/\s+/g, '-')}`;
                const isExporting = exportingGroup === groupName;
                return (
                  <div key={groupName} className={styles.groupBlock}>
                    <div className={styles.groupHeader}>
                      <span className={styles.groupTitle}>{groupName}<span className={styles.groupCount}>{currentGroups[groupName].length} SDOs</span></span>
                      <div className={styles.groupActions}>
                        <button className={`${styles.groupDownloadBtn} ${isExporting ? styles.groupDownloadBusy : ''}`}
                          onClick={() => handleGroupDownload(groupName, 'Q1', 'pdf')} disabled={isExporting || slides.length === 0}>
                          {isExporting ? '⏳ Generating...' : `⬇ PDF Report`}
                        </button>
                        <button className={`${styles.groupPptxBtn} ${isExporting ? styles.groupDownloadBusy : ''}`}
                          onClick={() => handleGroupDownload(groupName, 'Q1', 'pptx')} disabled={isExporting || slides.length === 0}>
                          {isExporting ? '⏳ Creating...' : `⬇ PPTX Slides`}
                        </button>
                      </div>
                    </div>
                    <div className={styles.previewContainer}>{slides.map((s, i) => <SlidePreview key={i} slide={s} />)}</div>
                    <div id={containerId} className={styles.pdfHiddenContainer}>{slides.map((s, i) => <SlidePreview key={i} slide={s} />)}</div>
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
