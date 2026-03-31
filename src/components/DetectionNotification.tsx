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

  // The specific tabs being listed
  const tabs = [
    { type: 'PREXC DATA', name: foundSheets.prexc, found: hasPrexc, icon: '📊' }
  ];

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div className={styles.successIcon}>📗</div>
          <h2 className={styles.title}>
            Scanning Google Sheets
          </h2>
          <p className={styles.subtitle}>
            Detected: {hasPrexc ? 'PREXC' : 'Nothing found'}
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
            {hasPrexc ? 'Continue' : 'Back to Search'}
          </button>
        </div>
      </div>
    </div>
  );
}
