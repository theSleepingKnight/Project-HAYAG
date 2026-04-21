'use client'

import { useState } from 'react';
import styles from './GeneratorOptions.module.css';

interface GeneratorOptionsProps {
  availableSections: { prexc: string | null; nonPrexc: string | null };
  onSectionChange: (section: string) => void;
  onQuarterChange?: (quarter: string) => void;
}

export default function GeneratorOptions({
  availableSections,
  onSectionChange,
  onQuarterChange,
}: GeneratorOptionsProps) {
  const [activeSection, setActiveSection] = useState<string>(
    availableSections.prexc ? 'prexc' : 'nonPrexc'
  );
  const [activeQuarter, setActiveQuarter] = useState('Q1');

  const handleSectionSwitch = (section: string) => {
    setActiveSection(section);
    onSectionChange(section);
  };

  const handleQuarterSwitch = (quarter: string) => {
    setActiveQuarter(quarter);
    if (onQuarterChange) onQuarterChange(quarter);
  };

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

  return (
    <div className={styles.container}>

      {/* 0. Report Section Selector */}
      <div className={styles.section}>
        <span className={styles.label}>Choose Report Section</span>
        
        <div className={styles.sectionToggle}>
          {/* Master PREXC Button */}
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

          {/* 9 SDO Tracks natively adjacent */}
          {SDO_LIST.map((sdo) => (
            <button
              key={sdo.code}
              className={`${styles.sectionBtn} ${activeSection === sdo.code ? styles.sectionActive : ''}`}
              onClick={() => handleSectionSwitch(sdo.code)}
            >
              <span className={styles.sectionIcon}>📊</span>
              {sdo.name}
              <span className={styles.sectionSub}>(NON-PREXC)</span>
            </button>
          ))}
        </div>
      </div>

      {/* 1. Quarter Selector */}
        <div className={styles.section}>
          <span className={styles.label}>Select Monitoring Quarter</span>
          <div className={styles.buttonGrid}>
            {['Q1', 'Q2', 'Q3', 'Q4'].map((q) => {
              return (
                <button
                  key={q}
                  className={`${styles.optionBtn} ${activeQuarter === q ? styles.active : ''}`}
                  onClick={() => handleQuarterSwitch(q)}
                >
                  <div>{q === 'Q1' ? 'First' : q === 'Q2' ? 'Second' : q === 'Q3' ? 'Third' : 'Fourth'} Quarter</div>
                </button>
              );
            })}
          </div>
        </div>

    </div>
  );
}
