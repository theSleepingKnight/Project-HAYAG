'use client'

import { useState } from 'react';
import styles from './GeneratorOptions.module.css';

interface GeneratorOptionsProps {
  availableSections: { prexc: string | null; nonPrexc: string | null };
  onSectionChange: (section: 'prexc' | 'nonPrexc' | 'master') => void;
}

export default function GeneratorOptions({
  availableSections,
  onSectionChange,
}: GeneratorOptionsProps) {
  const [activeSection, setActiveSection] = useState<'prexc' | 'nonPrexc' | 'master'>(
    availableSections.prexc ? 'prexc' : 'nonPrexc'
  );
  const [activeQuarter, setActiveQuarter] = useState('Q1');

  const handleSectionSwitch = (section: 'prexc' | 'nonPrexc' | 'master') => {
    setActiveSection(section);
    onSectionChange(section);
  };

  return (
    <div className={styles.container}>

      {/* 0. PREXC / NON-PREXC Section Selector */}
      <div className={styles.section}>
        <span className={styles.label}>Choose Report Section</span>
        <div className={styles.sectionToggle}>
          {availableSections.prexc && (
            <button
              className={`${styles.sectionBtn} ${activeSection === 'prexc' ? styles.sectionActive : ''}`}
              onClick={() => handleSectionSwitch('prexc')}
            >
              <span className={styles.sectionIcon}>📋</span>
              PREXC
              <span className={styles.sectionSub}>Program Category</span>
            </button>
          )}
          {availableSections.nonPrexc && (
            <button
              className={`${styles.sectionBtn} ${activeSection === 'nonPrexc' ? styles.sectionActive : ''}`}
              onClick={() => handleSectionSwitch('nonPrexc')}
            >
              <span className={styles.sectionIcon}>📁</span>
              NON-PREXC
              <span className={styles.sectionSub}>Non-Program Category</span>
            </button>
          )}
          {availableSections.prexc && availableSections.nonPrexc && (
            <button
              className={`${styles.sectionBtn} ${activeSection === 'master' ? styles.sectionActive : ''}`}
              onClick={() => handleSectionSwitch('master')}
            >
              <span className={styles.sectionIcon}>🌟</span>
              COMBINED
              <span className={styles.sectionSub}>Master Report (Both)</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. Quarter Selector */}
      <div className={styles.section}>
        <span className={styles.label}>Select Monitoring Quarter</span>
        <div className={styles.buttonGrid}>
          {['Q1', 'Q2', 'Q3', 'Q4'].map((q) => {
            const isQ1 = q === 'Q1';
            return (
              <button
                key={q}
                className={`${styles.optionBtn} ${activeQuarter === q ? styles.active : ''}`}
                onClick={() => isQ1 && setActiveQuarter(q)}
                disabled={!isQ1}
              >
                <div>{q === 'Q1' ? 'First' : q === 'Q2' ? 'Second' : q === 'Q3' ? 'Third' : 'Fourth'} Quarter</div>
                {!isQ1 && <div style={{ fontSize: '0.6rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '4px' }}>Unavailable</div>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Template Selector removed (Defaulting to Formal PDF theme) */}

    </div>
  );
}
