'use client';

import React from 'react';
import styles from './DetectionNotification.module.css';

interface DetectionNotificationProps {
  isOpen: boolean;
  onClose: () => void;
  foundSheets: {
    prexc: string | null;
    nonPrexc: string | null;
  };
}

export default function DetectionNotification({
  isOpen,
  onClose,
  foundSheets,
}: DetectionNotificationProps) {
  if (!isOpen) return null;

  const hasPrexc = !!foundSheets.prexc;
  
  // Count how many SDO-specific tabs ending in -NP are present in foundSheets keys
  const sdoSheets = Object.keys(foundSheets).filter(key => key.toUpperCase().includes('-NP'));
  const hasNonPrexc = sdoSheets.length > 0;

  // The specific tabs being listed
  const tabs = [
    { type: 'PREXC DATA', name: foundSheets.prexc, found: hasPrexc, icon: '📋' },
    { 
      type: 'NON-PREXC DATA', 
      name: hasNonPrexc ? `${sdoSheets.length} SDO Sheets detected` : 'Not Found', 
      found: hasNonPrexc, 
      icon: '📊' 
    }
  ];

  let detectionText = 'Nothing found';
  if (hasPrexc && hasNonPrexc) {
    detectionText = 'PREXC & NON-PREXC';
  } else if (hasPrexc) {
    detectionText = 'PREXC ONLY';
  } else if (hasNonPrexc) {
    detectionText = 'NON-PREXC ONLY';
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div className={styles.successIcon}>📗</div>
          <h2 className={styles.title}>
            Scanning Google Sheets
          </h2>
          <p className={styles.subtitle}>
            Detected: {detectionText}
          </p>
        </div>
        
        <div className={styles.body}>
          <div className={styles.tabList}>
            {tabs.map((tab, idx) => (
              <div key={idx} className={`${styles.tabItem} ${!tab.found ? styles.tabMissing : ''}`}>
                <span className={styles.tabIcon}>{tab.found ? tab.icon : '❌'}</span>
                <div className={styles.tabInfo}>
                  <span className={styles.tabType}>{tab.type}</span>
                  <span className={styles.tabName}>{tab.name || 'Not Found'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.closeButton} onClick={onClose}>
            {hasPrexc || hasNonPrexc ? 'Continue' : 'Back to Search'}
          </button>
        </div>
      </div>
    </div>
  );
}
