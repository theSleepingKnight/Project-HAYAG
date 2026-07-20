'use client'

import styles from './QuarterSelector.module.css';

interface QuarterSelectorProps {
  activeQuarter: string;
  onQuarterChange: (quarter: string) => void;
}

export default function QuarterSelector({
  activeQuarter,
  onQuarterChange,
}: QuarterSelectorProps) {
  return (
    <div style={{ width: '100%', marginTop: '2rem', marginBottom: '1.5rem' }}>
      <div style={{ padding: 0 }}>
        <span className={styles.label}>Select Monitoring Quarter</span>
        <div className={styles.buttonGrid}>
          {['Q1', 'Q2', 'Q3', 'Q4'].map((q) => {
            return (
              <button
                key={q}
                className={`${styles.optionBtn} ${activeQuarter === q ? styles.active : ''}`}
                onClick={() => onQuarterChange(q)}
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
