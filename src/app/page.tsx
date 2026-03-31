'use client'

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
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

function getEffectiveGroups(section: string, baseGroups: Record<string, string[]>): Record<string, string[]> {
  if (section === 'prexc' || section === 'nonPrexc' || section === 'master') return baseGroups;
  let singleSdoName = section;
  if (section.includes('Dap')) singleSdoName = 'SDO Dapitan City';
  else if (section.includes('Dip')) singleSdoName = 'SDO Dipolog City';
  else if (section.includes('Isa')) singleSdoName = 'SDO Isabela City';
  else if (section.includes('Pag')) singleSdoName = 'SDO Pagadian City';
  else if (section.includes('ZamC')) singleSdoName = 'SDO Zamboanga City';
  else if (section.includes('ZDN')) singleSdoName = 'SDO Zamboanga del Norte';
  else if (section.includes('ZDS')) singleSdoName = 'SDO Zamboanga del Sur';
  else if (section.includes('ZSP')) singleSdoName = 'SDO Zamboanga Sibugay';
  else if (section.includes('Sul')) singleSdoName = 'SDO Sulu';
  
  return { 'Individual Report': [singleSdoName] };
}
import { ProgramSection } from '@/lib/data-engine';
import DetectionNotification from '@/components/DetectionNotification';

interface SheetInfo {
  spreadsheetId: string;
  foundSheets: { prexc: string | null; nonPrexc: string | null; };
}

export default function Home() {
  const [sheetLink, setSheetLink] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [sheetInfo, setSheetInfo] = useState<SheetInfo | null>(null);

  const [currentGroups, setCurrentGroups] = useState<Record<string, string[]>>({});
  const [activeSection, setActiveSection] = useState<string>('prexc');
  const [activeQuarter, setActiveQuarter] = useState<string>('Q1');

  const [groupSlides, setGroupSlides] = useState<Record<string, SlideData[]>>({});
  const [exportingGroup, setExportingGroup] = useState<string | null>(null);

  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showDetectionSuccess, setShowDetectionSuccess] = useState(false);
  const [pendingDownload, setPendingDownload] = useState<{ groupName: string; quarter: string; format: 'pdf' | 'pptx' } | null>(null);

  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

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
    async (info: SheetInfo, section: string, baseGroups: Record<string, string[]>, quarter: string) => {
      setIsLoadingData(true);
      const groups = getEffectiveGroups(section, baseGroups);
      
      try {
        if (section === 'master') {
          const [resPre, resNon] = await Promise.all([
            info.foundSheets.prexc ? fetchSheetData(info.spreadsheetId, info.foundSheets.prexc) : Promise.resolve({ success: false, data: [] }),
            info.foundSheets.nonPrexc ? fetchSheetData(info.spreadsheetId, info.foundSheets.nonPrexc) : Promise.resolve({ success: false, data: [] })
          ]);
          const pBatch = resPre.success && resPre.data.length > 0 ? extractRealSheetData(resPre.data as unknown[][], buildDynamicConfig(resPre.data as unknown[][], 'PREXC', quarter)) : [];
          const nBatch = resNon.success && resNon.data.length > 0 ? extractRealSheetData(resNon.data as unknown[][], buildDynamicConfig(resNon.data as unknown[][], info.foundSheets.nonPrexc!, quarter)) : [];

          rebuildSlides([
            { progs: pBatch, label: 'PREXC (PROGRAM EXPENDITURE CLASSIFICATION)' },
            { progs: nBatch, label: 'NON-PREXC (NON-PROGRAM EXPENDITURE)' }
          ], groups, quarter);
          return;
        }

        let tabName: string | null = null;
        let sectionLabel = '';

        if (section === 'prexc') {
          tabName = info.foundSheets.prexc;
          sectionLabel = 'PREXC (PROGRAM EXPENDITURE CLASSIFICATION)';
        } else if (section === 'nonPrexc') {
          tabName = info.foundSheets.nonPrexc;
          sectionLabel = 'NON-PREXC (NON-PROGRAM EXPENDITURE)';
        } else {
          tabName = section;
          sectionLabel = `NON-PREXCY (${section})`;
        }
        
        if (!tabName) {
          const mock = buildMockReportFromCoordinates();
          rebuildSlides([{ progs: mock, label: sectionLabel }], groups, quarter);
          return;
        }
        
        const result = await fetchSheetData(info.spreadsheetId, tabName);
        if (result.success && result.data.length > 0) {
          const config = buildDynamicConfig(result.data as unknown[][], tabName, quarter);
          const extracted = extractRealSheetData(result.data as unknown[][], config);
          rebuildSlides([{ progs: extracted, label: sectionLabel }], groups, quarter);
        }
      } finally {
        setIsLoadingData(false);
      }
    },
    [rebuildSlides]
  );

  const handleBeginExtraction = async () => {
    if (!sheetLink || cooldown > 0) return;
    setIsDetecting(true);
    // Start countdown immediately for UI feedback
    setCooldown(5);
    
    try {
      const result = await detectSheetFeatures(sheetLink);
      if (result.spreadsheetId) {
        setSheetInfo({ spreadsheetId: result.spreadsheetId, foundSheets: result.foundSheets });
        setShowDetectionSuccess(true);
      } else if (!result.success) {
        alert(result.message);
      }
    } finally {
      setIsDetecting(false);
    }
  };

  const handleGroupsChange = useCallback((groups: Record<string, string[]>) => {
    setCurrentGroups(groups);
    if (sheetInfo) loadSectionData(sheetInfo, activeSection, groups, activeQuarter);
  }, [sheetInfo, activeSection, activeQuarter, loadSectionData]);

  const handleSectionChange = useCallback((section: string) => {
    setActiveSection(section);
    if (sheetInfo && Object.keys(currentGroups).length > 0) loadSectionData(sheetInfo, section, currentGroups, activeQuarter);
  }, [sheetInfo, currentGroups, activeQuarter, loadSectionData]);

  const handleQuarterChange = useCallback((quarter: string) => {
    setActiveQuarter(quarter);
    if (sheetInfo && Object.keys(currentGroups).length > 0) loadSectionData(sheetInfo, activeSection, currentGroups, quarter);
  }, [sheetInfo, activeSection, currentGroups, loadSectionData]);


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

  const effectiveGroupsForRender = getEffectiveGroups(activeSection, currentGroups);
  const activeGroups = Object.entries(effectiveGroupsForRender).filter(([, sdos]) => sdos.length > 0);

  return (
    <main className={styles.dashboard}>
      <DownloadModal isOpen={showDownloadModal} groupName={pendingDownload?.groupName ?? ''} quarter={pendingDownload?.quarter ?? 'Q1'}
        onConfirm={handleModalConfirm} onCancel={() => { setShowDownloadModal(false); setPendingDownload(null); }} />
      
      <DetectionNotification 
        isOpen={showDetectionSuccess} 
        onClose={() => { setShowDetectionSuccess(false); }} 
        foundSheets={sheetInfo?.foundSheets ?? { prexc: null, nonPrexc: null }} 
      />

      <div className={styles.card}>
        <div className={styles.logoContainer}>
          <Image 
            src="/deped-region9.png" 
            alt="DepEd Region IX Logo" 
            width={75} 
            height={75} 
            priority
            className={styles.regionLogo} 
          />
          <div className={styles.logoArea}>
            <div className={styles.divider}></div>
            <span>DEPED REGION IX</span>
            <div className={styles.divider}></div>
          </div>
        </div>
        <h1 className={styles.title}>H·A·Y·A·G</h1>
        <p className={styles.subtitle}>Holistic Analysis of Yearly Accomplishments and Governance</p>
        <div className={styles.appLabel}>Report Generator</div>
        <div className={styles.inputGroup}>
          <input type="text" className={styles.inputField} placeholder="Paste Google Sheet Link..." value={sheetLink} onChange={(e) => setSheetLink(e.target.value)} />
        </div>
        
        {cooldown > 0 && (
          <div className={styles.cooldownLabel}>Please wait {cooldown}s before extracting again</div>
        )}
        <button 
          className={styles.actionButton} 
          onClick={handleBeginExtraction} 
          disabled={isDetecting || cooldown > 0}
        >
          {isDetecting ? 'Scanning Sheets...' : 'Begin Extraction'}
        </button>
      </div>

      {sheetInfo && (
        <>
          {activeSection === 'prexc' && (
            <SdoGrouping onGroupsChange={handleGroupsChange} hasData={true} />
          )}
          
          <GeneratorOptions 
            availableSections={sheetInfo.foundSheets} 
            onSectionChange={handleSectionChange}
            onQuarterChange={handleQuarterChange}
          />
          
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
                    <span className={styles.groupTitle}>{groupName}<span className={styles.groupCount}>{effectiveGroupsForRender[groupName].length} SDOs</span></span>
                    <div className={styles.groupActions}>
                      <button className={`${styles.groupDownloadBtn} ${isExporting ? styles.groupDownloadBusy : ''}`}
                        onClick={() => handleGroupDownload(groupName, activeQuarter, 'pdf')} disabled={isExporting || slides.length === 0}>
                        {isExporting ? '⏳ Generating...' : `⬇ PDF Report`}
                      </button>
                      <div className={styles.pptxWrapper}>
                        <button 
                          className={`${styles.groupPptxBtn} ${isExporting ? styles.groupDownloadBusy : ''}`}
                          disabled={true}
                        >
                          ⬇ PPTX Slides
                        </button>
                        <span className={styles.comingSoon}>Coming soon.</span>
                      </div>
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
