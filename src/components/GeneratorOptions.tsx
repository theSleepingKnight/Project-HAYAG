'use client'

import { useState } from 'react';
import styles from './GeneratorOptions.module.css';

interface GeneratorOptionsProps {
  availableSections: { prexc: string | null; nonPrexc: string | null };
  onSectionChange: (section: 'prexc' | 'nonPrexc') => void;
  onGenerate: (format: 'pdf' | 'slides', options: { quarter: string; template: string }) => void;
}

export default function GeneratorOptions({
  availableSections,
  onSectionChange,
  onGenerate,
}: GeneratorOptionsProps) {
  const [activeSection, setActiveSection] = useState<'prexc' | 'nonPrexc'>(
    availableSections.prexc ? 'prexc' : 'nonPrexc'
  );
  const [activeQuarter, setActiveQuarter] = useState('Q1');
  const [activeTemplate, setActiveTemplate] = useState('Formal');

  const handleSectionSwitch = (section: 'prexc' | 'nonPrexc') => {
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
              <span className={styles.sectionSub}>Program Expenditure Classification</span>
            </button>
          )}
          {availableSections.nonPrexc && (
            <button
              className={`${styles.sectionBtn} ${activeSection === 'nonPrexc' ? styles.sectionActive : ''}`}
              onClick={() => handleSectionSwitch('nonPrexc')}
            >
              <span className={styles.sectionIcon}>📁</span>
              NON-PREXC
              <span className={styles.sectionSub}>Non-Program Expenditure Classification</span>
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

      {/* 2. Template Selector */}
      <div className={styles.section}>
        <span className={styles.label}>Choose Design Theme</span>
        <div className={styles.buttonGrid}>
          {['Formal', 'Presentation'].map((t) => (
            <button
              key={t}
              className={`${styles.optionBtn} ${activeTemplate === t ? styles.active : ''}`}
              onClick={() => setActiveTemplate(t)}
            >
              {t === 'Formal' ? 'The Formal Corporate (Classic)' : 'The Presentation Modern (Visual)'}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Export Actions — "Generate All" buttons */}
      <div className={styles.generateArea}>
        <button
          className={`${styles.exportBtn} ${styles.pdfBtn}`}
          onClick={() => handleExport('pdf')}
        >
          ⬇ Download All Groups (PDF)
        </button>
        <button
          className={`${styles.exportBtn} ${styles.slidesBtn}`}
          onClick={() => handleExport('slides')}
        >
          🔗 Create Google Slides (Editable)
        </button>
      </div>

    </div>
  );
}
