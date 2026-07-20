'use client'

import { useState, useEffect } from 'react';
import styles from './SdoGrouping.module.css';
import { EMPTY_GROUPS_STATE } from '@/lib/config';
import SmartSlideBuilder from './SmartSlideBuilder';

interface SdoGroupingProps {
  onGroupsChange?: (groups: Record<string, string[]>) => void;
  hasData: boolean;
}

export default function SdoGrouping({ onGroupsChange, hasData }: SdoGroupingProps) {
  const [groups, setGroups] = useState<Record<string, string[]>>(EMPTY_GROUPS_STATE);

  // 1. Initial Load: If hasData is true, we populate the initial names
  useEffect(() => {
    if (!hasData) {
      setTimeout(() => setGroups(EMPTY_GROUPS_STATE), 0);
      return;
    }

    const saved = localStorage.getItem('hayag_sdo_groups');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure we don't accidentally load an empty state from storage
        const hasSavedItems = Object.values(parsed as Record<string, string[]>).some(arr => arr.length > 0);
        if (hasSavedItems) {
          // Merge with EMPTY_GROUPS_STATE in case new groups were added to config
          setTimeout(() => setGroups({ ...EMPTY_GROUPS_STATE, ...parsed }), 0);
          return;
        }
      } catch (e) {
        console.error("Failed to load saved groupings:", e);
      }
    }

    // Default to an empty group layout so all SDOs start in the Tray
    setTimeout(() => setGroups(EMPTY_GROUPS_STATE), 0);
  }, [hasData]);

  // 2. Sync groups to parent + persist to localStorage (only if we HAVE data)
  useEffect(() => {
    if (hasData && onGroupsChange) {
      onGroupsChange(groups);
      
      const hasSomething = Object.values(groups).some(arr => arr.length > 0);
      if (hasSomething) {
        localStorage.setItem('hayag_sdo_groups', JSON.stringify(groups));
      }
    }
  }, [groups, onGroupsChange, hasData]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {!hasData ? (
        <div className={styles.placeholder}>
          <div className={styles.placeholderIcon}>🔧</div>
          <p>Paste a Google Sheet link above to configure your SDO groups here.</p>
        </div>
      ) : (
        <SmartSlideBuilder groups={groups} setGroups={setGroups} />
      )}
    </div>
  );
}
