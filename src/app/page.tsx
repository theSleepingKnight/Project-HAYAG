'use client'

import { useState, useCallback, useEffect } from 'react';
import styles from './page.module.css';
import SdoGrouping from '@/components/SdoGrouping';
import QuarterSelector from '@/components/QuarterSelector';
import SlidePreview from '@/components/SlidePreview';
import DownloadModal, { PdfFormData } from '@/components/DownloadModal';
import { generateHAYAGPdf } from '@/lib/pdf-generator';
import { generateHAYAGPptx } from '@/lib/pptx-generator';
import DetectionNotification from '@/components/DetectionNotification';
import ReportGeneratorCard from '@/components/ReportGeneratorCard';
import { useExtraction } from '@/hooks/useExtraction';
import { EMPTY_GROUPS_STATE } from '@/lib/config';

const SDO_LIST = [
  { name: 'Dapitan City', code: 'Dap-NP2026' },
  { name: 'Dipolog City', code: 'Dip-NP2026' },
  { name: 'Isabela City', code: 'Isa-NP2026' },
  { name: 'Pagadian City', code: 'Pag-NP2026' },
  { name: 'Sulu', code: 'Sul-NP2026' },
  { name: 'Zamboanga City', code: 'ZamC-NP2026' },
  { name: 'Zamboanga del Norte', code: 'ZDN-NP2026' },
  { name: 'Zamboanga del Sur', code: 'ZDS-NP2026' },
  { name: 'Zamboanga Sibugay', code: 'ZSP-NP2026' },
];

export default function Home() {
  const {
    sheetLink, setSheetLink,
    isDetecting,
    isLoadingData,
    sheetInfo,
    cooldown,
    activeSection, setActiveSection,
    activeQuarter, setActiveQuarter,
    groupSlides,
    showDetectionSuccess, setShowDetectionSuccess,
    startExtraction,
    loadSectionData,
    getEffectiveGroups
  } = useExtraction();

  const [currentGroups, setCurrentGroups] = useState<Record<string, string[]>>({});
  const [exportingGroup, setExportingGroup] = useState<string | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [pendingDownload, setPendingDownload] = useState<{ groupName: string; quarter: string; format: 'pdf' | 'pptx' } | null>(null);
  const [exportProgressText, setExportProgressText] = useState<string | null>(null);
  
  // Tab State
  const isPrexcTab = activeSection === 'prexc';
  
  // New: Manual Scale Control
  const [previewScale, setPreviewScale] = useState<number>(0.8);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 641) {
      setTimeout(() => setPreviewScale(1.0), 0);
    }
  }, []);

  const handleGroupsChange = useCallback((groups: Record<string, string[]>) => {
    setCurrentGroups(groups);
    if (sheetInfo) loadSectionData(sheetInfo, activeSection, groups, activeQuarter);
  }, [sheetInfo, activeSection, activeQuarter, loadSectionData]);

  const handleSectionChange = useCallback((section: string) => {
    setActiveSection(section);
    if (sheetInfo) loadSectionData(sheetInfo, section, currentGroups, activeQuarter);
  }, [sheetInfo, currentGroups, activeQuarter, loadSectionData, setActiveSection]);

  const handleQuarterChange = useCallback((quarter: string) => {
    setActiveQuarter(quarter);
    if (sheetInfo) loadSectionData(sheetInfo, activeSection, currentGroups, quarter);
  }, [sheetInfo, activeSection, currentGroups, loadSectionData, setActiveQuarter]);

  const handleAutoFit = useCallback(() => {
    const container = document.querySelector(`.${styles.dashboard}`);
    if (!container) return;
    
    const availableWidth = Math.min(window.innerWidth, 1200) - 64; // Account for padding
    const scale = Math.floor((availableWidth / 1122) * 100) / 100;
    setPreviewScale(Math.max(0.3, Math.min(scale, 1.2)));
  }, []);

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
    
    await new Promise(r => setTimeout(r, 400));
    
    const options = {
      filename: `Q${quarter.match(/\d/)?.[0]}_${activeSection.toUpperCase()}_${groupName.replace(/\s+/g, '_')}.${format}`,
      quarter,
      date: formData.date,
      location: formData.location,
      outlineItems: formData.outlineItems,
    };

    if (format === 'pdf') {
      setExportProgressText('Preparing...');
      await generateHAYAGPdf(containerId, options, (current, total) => {
        setExportProgressText(`Page ${current} of ${total}`);
      });
    } else {
      const slides = groupSlides[groupName] || [];
      await generateHAYAGPptx(slides, options);
    }
    
    setExportingGroup(null);
    setExportProgressText(null);
    setPendingDownload(null);
  };

  const effectiveGroupsForRender = getEffectiveGroups(activeSection, currentGroups);
  const activeGroups = Object.entries(effectiveGroupsForRender).filter(([, sdos]) => sdos.length > 0);

  return (
    <main className={styles.dashboard}>
      <DownloadModal 
        isOpen={showDownloadModal} 
        groupName={pendingDownload?.groupName ?? ''} 
        quarter={pendingDownload?.quarter ?? 'Q1'}
        onConfirm={handleModalConfirm} 
        onCancel={() => { setShowDownloadModal(false); setPendingDownload(null); }} 
      />
      
      <DetectionNotification 
        isOpen={showDetectionSuccess} 
        onClose={() => { setShowDetectionSuccess(false); }} 
        foundSheets={sheetInfo?.foundSheets ?? { prexc: null, nonPrexc: null }} 
      />

      {exportProgressText && (
        <div className={styles.progressOverlay}>
          <div className={styles.progressCard}>
            <div className={styles.spinner}></div>
            <h3 className={styles.progressTitle}>Generating PDF Report</h3>
            <div className={styles.progressText}>{exportProgressText}</div>
            <p className={styles.progressSubtext}>
              Converting live spreadsheet tables into landscape PDF layout. Please do not close this window.
            </p>
          </div>
        </div>
      )}

      <ReportGeneratorCard 
        sheetLink={sheetLink} 
        setSheetLink={setSheetLink} 
        isDetecting={isDetecting} 
        cooldown={cooldown} 
        onExtract={() => {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('hayag_sdo_groups');
          }
          setCurrentGroups(EMPTY_GROUPS_STATE);
          startExtraction(EMPTY_GROUPS_STATE);
        }} 
      />

      {sheetInfo && (
        <div style={{ width: '100%', maxWidth: '1200px', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '2rem' }}>
          
          {/* ---- MASSIVE TABS UI ---- */}
          <div className={styles.mainTabsContainer}>
            <button 
              className={`${styles.mainTabBtn} ${isPrexcTab ? styles.mainTabActive : ''}`}
              onClick={() => handleSectionChange('prexc')}
            >
              📋 PREXC REPORT
            </button>
            <button 
              className={`${styles.mainTabBtn} ${!isPrexcTab ? styles.mainTabActive : ''}`}
              onClick={() => {
                // If they switch to Non-Prexc, default to the first SDO if it's currently on Prexc
                if (isPrexcTab) handleSectionChange(SDO_LIST[0].code);
              }}
            >
              📊 NON-PREXC REPORT
            </button>
          </div>

          <div className={styles.tabContentArea}>
            {isPrexcTab ? (
              /* ---- PREXC TAB CONTENT ---- */
              <div className={styles.tabSection}>
                <h3 className={styles.tabHeading}>Configure PREXC Layout</h3>
                <SdoGrouping onGroupsChange={handleGroupsChange} hasData={true} />
                <QuarterSelector activeQuarter={activeQuarter} onQuarterChange={handleQuarterChange} />
              </div>
            ) : (
              /* ---- NON-PREXC TAB CONTENT ---- */
              <div className={styles.tabSection}>
                <h3 className={styles.tabHeading}>Select NON-PREXC SDO</h3>
                <div className={styles.nonPrexcGrid}>
                  {SDO_LIST.map((sdo) => (
                    <button
                      key={sdo.code}
                      className={`${styles.nonPrexcBtn} ${activeSection === sdo.code ? styles.nonPrexcActive : ''}`}
                      onClick={() => handleSectionChange(sdo.code)}
                    >
                      {sdo.name}
                    </button>
                  ))}
                </div>
                <QuarterSelector activeQuarter={activeQuarter} onQuarterChange={handleQuarterChange} />
              </div>
            )}
          </div>
          
          {activeGroups.length > 0 && (
            <div style={{ marginTop: '3rem', width: '100%' }}>
              <h3 style={{ marginBottom: '1.5rem', color: '#1B365D', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.05em' }}>
                {isLoadingData ? '⏳ Loading live sheet data...' : 'Comparison Table Preview'}
              </h3>
              
              <div style={{ '--preview-scale': previewScale } as React.CSSProperties}>
                {activeGroups.map(([groupName]) => {
                  const slides = groupSlides[groupName] ?? [];
                  const containerId = `pdf-hidden-${groupName.toLowerCase().replace(/\s+/g, '-')}`;
                  const isExporting = exportingGroup === groupName;
                  return (
                    <div key={`${groupName}-${activeSection}`} className={styles.groupBlock}>
                      <div className={styles.groupHeader}>
                        <span className={styles.groupTitle}>
                          {groupName}
                          <span className={styles.groupCount}>{effectiveGroupsForRender[groupName].length} SDOs</span>
                        </span>
                        <div className={styles.groupActions}>
                        <div className={styles.zoomControlsHeader}>
                          <span className={styles.zoomLabel}>Zoom: {Math.round(previewScale * 100)}%</span>
                          <input 
                            type="range" 
                            min="0.3" 
                            max="1.5" 
                            step="0.05" 
                            className={styles.zoomSliderCompact}
                            value={previewScale}
                            onChange={(e) => setPreviewScale(parseFloat(e.target.value))}
                          />
                          <button className={styles.autoFitBtnCompact} onClick={handleAutoFit}>Auto-Fit</button>
                        </div>

                        <button 
                          className={`${styles.groupDownloadBtn} ${isExporting ? styles.groupDownloadBusy : ''}`}
                          onClick={() => handleGroupDownload(groupName, activeQuarter, 'pdf')} 
                          disabled={isExporting || slides.length === 0}
                        >
                          {isExporting ? (exportProgressText || '⏳ Generating...') : `⬇ PDF Report`}
                        </button>
                          <div className={styles.pptxWrapper}>
                            <button className={styles.groupPptxBtn} disabled={true}>
                              ⬇ PPTX Slides
                            </button>
                            <span className={styles.comingSoon}>Coming soon.</span>
                          </div>
                        </div>
                      </div>
                      <div className={styles.previewContainer}>
                        {slides.map((s, i) => <SlidePreview key={i} slide={s} />)}
                      </div>
                      {isExporting && (
                        <div id={containerId} className={styles.pdfHiddenContainer}>
                          {slides.map((s, i) => <SlidePreview key={i} slide={s} />)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
