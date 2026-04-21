'use client'

import { useState, useCallback, useEffect } from 'react';
import styles from './page.module.css';
import SdoGrouping from '@/components/SdoGrouping';
import GeneratorOptions from '@/components/GeneratorOptions';
import SlidePreview from '@/components/SlidePreview';
import DownloadModal, { PdfFormData } from '@/components/DownloadModal';
import { generateHAYAGPdf } from '@/lib/pdf-generator';
import { generateHAYAGPptx } from '@/lib/pptx-generator';
import DetectionNotification from '@/components/DetectionNotification';
import ReportGeneratorCard from '@/components/ReportGeneratorCard';
import { useExtraction } from '@/hooks/useExtraction';

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
  
  // New: Manual Scale Control
  const [previewScale, setPreviewScale] = useState<number>(0.8);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (window.innerWidth < 641) {
      setPreviewScale(1.0);
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
    // Standard table width is 1122px. We want to fit it into the parent container width.
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

      <ReportGeneratorCard 
        sheetLink={sheetLink} 
        setSheetLink={setSheetLink} 
        isDetecting={isDetecting} 
        cooldown={cooldown} 
        onExtract={() => startExtraction(currentGroups)} 
      />

      {sheetInfo && (
        <div style={{ width: '100%', maxWidth: '1200px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {activeSection === 'prexc' && (
            <SdoGrouping onGroupsChange={handleGroupsChange} hasData={true} />
          )}
          
          <GeneratorOptions 
            availableSections={sheetInfo.foundSheets} 
            onSectionChange={handleSectionChange}
            onQuarterChange={handleQuarterChange}
          />
          
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
                          {isExporting ? '⏳ Generating...' : `⬇ PDF Report`}
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
