import React from 'react';
import styles from './SlidePreview.module.css';
import { SlideData } from '@/lib/slide-mapper';
import { AnnualTarget } from '@/lib/data-engine';

interface SlidePreviewProps {
  slide: SlideData;
  template?: 'Formal' | 'Presentation';
}

/** Render the Annual Physical Target cell content */
function AnnualTargetCell({ target }: { target: AnnualTarget }) {
  const { co, ro, total } = target;

  if (!co && !ro) {
    return <span className={styles.na}>—</span>;
  }

  // Both CO and RO present → show full breakdown
  if (co && ro) {
    return (
      <div className={styles.targetBreakdown}>
        <div className={styles.targetLine}>
          <span className={styles.targetLabel}>CO:</span>
          <span className={styles.targetNum}>{co}</span>
        </div>
        <div className={styles.targetLine}>
          <span className={styles.targetLabel}>RO:</span>
          <span className={styles.targetNum}>{ro}</span>
        </div>
        <div className={styles.targetTotal}>
          = {total}
        </div>
      </div>
    );
  }

  // Only one side present
  return (
    <div className={styles.targetBreakdown}>
      {co && (
        <div className={styles.targetLine}>
          <span className={styles.targetLabel}>CO:</span>
          <span className={styles.targetNum}>{co}</span>
        </div>
      )}
      {ro && (
        <div className={styles.targetLine}>
          <span className={styles.targetLabel}>RO:</span>
          <span className={styles.targetNum}>{ro}</span>
        </div>
      )}
    </div>
  );
}

export default function SlidePreview({ slide, template = 'Formal' }: SlidePreviewProps) {

  // ── DIVIDER SLIDE ──────────────────────────────────────────────────────────
  if (slide.type === 'divider') {
    const qNum = slide.quarter.match(/\d/)?.[0] || '1';
    const ordinals: Record<string, string> = { '1': '1st', '2': '2nd', '3': '3rd', '4': '4th' };
    const fullHeading = `${ordinals[qNum] || qNum} Quarter Monitoring Report`;
    return (
      <div className={`${styles.slide} ${styles.dividerSlide}`}>
        <div className={styles.dividerContent}>
          <p className={styles.dividerQuarter}>{fullHeading}</p>
          <h1 className={styles.dividerTitle}>{slide.sectionTitle}</h1>
          {slide.sdosInThisSlide && slide.sdosInThisSlide.length > 0 && (
            <div className={styles.dividerSdoList}>
              {slide.sdosInThisSlide.join(' | ')}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── DATA SLIDE ─────────────────────────────────────────────────────────────
  const { quarter, groupName, sdosInThisSlide, programSections } = slide;
  const totalCols = 2 + sdosInThisSlide.length + 1; // PPAS + Target + SDOs + Remarks

  return (
    <div className={`${styles.slide} ${template === 'Formal' ? styles.formal : styles.presentation}`}>

      {/* Header */}
      <div className={styles.header}>
        <span className={styles.quarterTag}>{quarter} Monitoring — {groupName}</span>
      </div>

      {/* Main comparison table — structured for PDF pagination */}
      <div className={styles.tableArea}>
        <table className={styles.comparisonTable}>
          <thead className={styles.tableHeaderGroup}>
            <tr className={styles.headerRow}>
              <th className={styles.mainCol}>INDICATORS / PPAS</th>
              <th className={styles.targetCol}>ANNUAL PHYSICAL TARGETS</th>
              {sdosInThisSlide.map((sdo) => (
                <th key={sdo} className={styles.sdoCol}>
                  {sdo.replace('SDO ', '')}
                </th>
              ))}
              <th className={styles.remarksCol}>REMARKS</th>
            </tr>
          </thead>
          <tbody>
            {programSections.map((program) => (
              <React.Fragment key={program.programName}>

                {/* Program spanning header row */}
                <tr>
                  <td colSpan={totalCols} className={styles.programCell}>
                    {program.programName}
                  </td>
                </tr>

                {program.groups.map((group, gi) => (
                  <React.Fragment key={gi}>

                    {/* Indicator group label (Outcome / Output) */}
                    {group.label && (
                      <tr>
                        <td colSpan={totalCols} className={styles.groupLabelCell}>
                          {group.label}
                        </td>
                      </tr>
                    )}

                    {/* Indicator rows */}
                    {group.rows.map((row, ri) => {
                      const isSubItem = /^[a-z]\.\s/.test(row.text.trim());

                      // ── Parent label row: spans all columns ─────────────
                      if (row.isParentLabel) {
                        return (
                          <tr key={ri}>
                            <td colSpan={totalCols} className={styles.parentLabelCell}>
                              {row.text}
                            </td>
                          </tr>
                        );
                      }

                      // ── Regular data row ────────────────────────────────
                      return (
                        <tr key={ri} className={styles.indicatorRow}>

                          {/* Indicator text with dynamic hierarchy indentation */}
                          <td className={`${styles.indicatorCell} ${isSubItem ? styles.subItemCell : ''}`}>
                            {row.text}
                          </td>

                          {/* Annual Physical Target — structured breakdown */}
                          <td className={styles.targetCell}>
                            <AnnualTargetCell target={row.annualTarget} />
                          </td>

                          {/* SDO Accomplishment Columns */}
                          {sdosInThisSlide.map((sdo) => {
                            const val   = row.sdoValues[sdo];
                            const isEmpty = !val || !val.raw;
                            const pct   = val?.percentage;
                            const color = isEmpty
                              ? '#94a3b8'
                              : pct !== null && pct !== undefined && pct >= 100
                                ? 'var(--status-complete)'
                                : 'var(--status-under)';

                            return (
                              <td key={sdo} className={styles.sdoCell} style={{ color }}>
                                {isEmpty ? (
                                  <span className={styles.na}>—</span>
                                ) : (
                                  <>
                                    <span className={styles.sdoValue}>
                                      {pct !== null && pct !== undefined ? `${pct}%` : val.raw}
                                    </span>
                                    {val.fraction && (
                                      <div className={styles.fraction}>{val.fraction}</div>
                                    )}
                                  </>
                                )}
                              </td>
                            );
                          })}

                          {/* Remarks */}
                          <td className={styles.remarksCell}>
                            {row.remarks || <span className={styles.na}>—</span>}
                          </td>

                        </tr>
                      );
                    })}

                  </React.Fragment>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.footer}>
        <span>DepEd Region IX | Project HAYAG</span>
      </div>
    </div>
  );
}
