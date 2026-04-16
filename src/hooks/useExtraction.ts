import { useState, useCallback, useEffect } from 'react';
import { detectSheetFeatures, fetchSheetData } from '@/app/actions';
import { extractRealSheetData } from '@/lib/data-engine-real';
import { buildDynamicConfig, ProgramSection } from '@/lib/data-engine';
import { mapToSlides, SlideData } from '@/lib/slide-mapper';

import { SDO_RECOGNITION_MAP } from '@/lib/config';

export interface SheetInfo {
  spreadsheetId: string;
  foundSheets: { prexc: string | null; nonPrexc: string | null; };
}

export function useExtraction() {
  const [sheetLink, setSheetLink] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [sheetInfo, setSheetInfo] = useState<SheetInfo | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const [activeSection, setActiveSection] = useState<string>('prexc');
  const [activeQuarter, setActiveQuarter] = useState<string>('Q1');
  const [groupSlides, setGroupSlides] = useState<Record<string, SlideData[]>>({});
  const [showDetectionSuccess, setShowDetectionSuccess] = useState(false);

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

  const getEffectiveGroups = (section: string, baseGroups: Record<string, string[]>) => {
    if (section === 'prexc' || section === 'nonPrexc' || section === 'master') return baseGroups;
    
    // Check if section name matches any known SDO pattern
    let singleSdoName = section;
    for (const [key, fullName] of Object.entries(SDO_RECOGNITION_MAP)) {
      if (section.includes(key)) {
        singleSdoName = fullName;
        break;
      }
    }
    
    return { 'Individual Report': [singleSdoName] };
  };

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
          sectionLabel = `NON-PREXC (${section})`;
        }
        
        if (!tabName) {
           // Fallback to mock data logic should go here if needed, but we focus on real for now
           setGroupSlides({});
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

  const startExtraction = async (groups: Record<string, string[]>) => {
    if (!sheetLink || cooldown > 0) return;
    setIsDetecting(true);
    setCooldown(5);
    
    try {
      const result = await detectSheetFeatures(sheetLink);
      if (result.spreadsheetId) {
        setSheetInfo({ spreadsheetId: result.spreadsheetId, foundSheets: result.foundSheets });
        setShowDetectionSuccess(true);
        // Load initial data
        loadSectionData({ spreadsheetId: result.spreadsheetId, foundSheets: result.foundSheets }, activeSection, groups, activeQuarter);
      } else if (!result.success) {
        alert(result.message);
      }
    } finally {
      setIsDetecting(false);
    }
  };

  return {
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
  };
}
