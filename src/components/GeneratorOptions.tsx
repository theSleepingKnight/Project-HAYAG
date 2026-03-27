'use client'

import { useState } from 'react';
import styles from './GeneratorOptions.module.css';

interface GeneratorOptionsProps {
  availableSections: { prexc: string | null; nonPrexc: string | null };
  onSectionChange: (section: 'prexc' | 'nonPrexc' | 'master') => void;
  onGenerate: (format: 'pdf' | 'slides', options: { quarter: string; template: string }) => void;
}

export default function GeneratorOptions({
  availableSections,
  onSectionChange,
  onGenerate,
}: GeneratorOptionsProps) {
  const [activeSection, setActiveSection] = useState<'prexc' | 'nonPrexc' | 'master'>(
    availableSections.prexc ? 'prexc' : 'nonPrexc'
  );
  const [activeQuarter, setActiveQuarter] = useState('Q1');
  const [activeTemplate, setActiveTemplate] = useState('Formal');

  const handleSectionSwitch = (section: 'prexc' | 'nonPrexc' | 'master') => {
    setActiveSection(section);
    onSectionChange(section);
  };

  const handleExport = (format: 'pdf' | 'slides') => {
    onGenerate(format, { quarter: activeQuarter, template: activeTemplate });
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
          {['Q1', 'Q2', 'Q3', 'Q4'].map((q) => (
            <button
              key={q}
              className={`${styles.optionBtn} ${activeQuarter === q ? styles.active : ''}`}
              onClick={() => setActiveQuarter(q)}
            >
              {q === 'Q1' ? 'First' : q === 'Q2' ? 'Second' : q === 'Q3' ? 'Third' : 'Fourth'} Quarter
            </button>
          ))}
        </div>
      </div>

      {/* Template Selector removed (Defaulting to Formal PDF theme) */}

    </div>
  );
}
