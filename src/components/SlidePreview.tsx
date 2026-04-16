import React from 'react';
import styles from './SlidePreview.module.css';
import { SlideData } from '@/lib/slide-mapper';
import { AnnualTarget, getAccomplishmentRate } from '@/lib/data-engine';
import { parseProgramName } from '@/lib/program-parser';
import { formatQuarterLabel, formatQuarterTitle } from '@/lib/config';

interface SlidePreviewProps {
  slide: SlideData;
  template?: 'Formal' | 'Presentation';
}

// ── Acrostic Text Renderer ─────────────────────────────────────────────────────

function AcrosticText({ text, acronym }: { text: string; acronym: string }) {
  if (!text) return null;

  // Render text as a normal flowing paragraph to prevent unbalanced vertical stacking.
  const tokens = text.split(/([\s\-/().,:]+)/);

  return (
    <div className={styles.programDefinitionFlowing}>
      {tokens.map((token, ti) => {
        if (!token) return null;
        
        // Punctuation and whitespace are rendered as-is
        if (/^[\s\-/().,:]+$/.test(token)) {
          return <React.Fragment key={ti}>{token}</React.Fragment>;
        }

        const upperToken = token.toUpperCase();
        
        // 1. Highlight if the entire token exactly matches the designated program acronym OR is a known Regional Acronym.
        // We do NOT want general uppercase words (like SDO, SPED) to be colored white.
        const REGIONAL_ACRONYMS = new Set(['GREAT', 'TEACH', 'SMART', 'LEARN', 'HEART', 'TRACE', 'EQUALS', 'RIZALISTANG', 'PANUKIDUKI']);
        
        if ((acronym && upperToken === acronym.toUpperCase()) || REGIONAL_ACRONYMS.has(upperToken)) {
           return (
            <span key={ti} className={styles.acrosticEmphasis}>
              {upperToken}
            </span>
          );
        }

        // Standard text, no special span needed
        return <React.Fragment key={ti}>{token}</React.Fragment>;
      })}
    </div>
  );
}

// ── Annual Target Cell ─────────────────────────────────────────────────────────

/** Renders the RO annual target value. */
function AnnualTargetCell({ target }: { target: AnnualTarget }) {
  const { ro } = target;

  if (!ro) {
    return <span className={styles.na}>—</span>;
  }

  return (
    <div className={styles.targetBreakdown} style={{ justifyContent: 'center' }}>
      <span className={styles.targetNum}>{ro}</span>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function SlidePreview({ slide, template = 'Formal' }: SlidePreviewProps) {

  // ── DIVIDER SLIDE ──────────────────────────────────────────────────────────
  if (slide.type === 'divider') {
    const fullHeading = formatQuarterTitle(slide.quarter);
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
  const totalCols = 2 + sdosInThisSlide.length + 2;
  const isIndividualSdoTab = groupName === 'Individual Report';

  return (
    <div className={`${styles.slide} ${template === 'Formal' ? styles.formal : styles.presentation}`}>

      {/* Slide header */}
      <div className={styles.header}>
        <span className={styles.quarterTag}>{formatQuarterLabel(quarter)} Monitoring — {groupName}</span>
      </div>

      {/* Main comparison table */}
      <div className={styles.tableArea}>
        <div className={styles.responsiveScroll}>
          <table className={styles.comparisonTable}>
            <thead className={styles.tableHeaderGroup}>
              <tr className={styles.headerRow}>
                <th className={styles.mainCol}>INDICATORS / PPAS</th>
                <th className={styles.targetCol}>RO TARGET</th>
                <th className={styles.remarksCol}>REMARKS (RO TARGET)</th>
                {sdosInThisSlide.map((sdo) => (
                  <th key={sdo} className={styles.sdoCol}>
                    {sdo.includes('SDO ') ? (
                      <>
                        <span className={styles.sdoPrefix}>SDO</span>
                        <div className={styles.sdoMainName}>{sdo.replace('SDO ', '')}</div>
                        <span className={styles.sdoPrefix} style={{ marginTop: '2px' }}>(Accomplishments)</span>
                      </>
                    ) : sdo}
                  </th>
                ))}
                <th className={styles.remarksCol}>REMARKS</th>
              </tr>
            </thead>
            <tbody>
              {programSections.map((program) => {
                const { division, title, acronym, definition } = parseProgramName(program.programName);

                return (
                  <React.Fragment key={program.programName}>

                    {/* ── Row 1 (optional): Division label ─────────────────
                        Rendered only when a division was separately detected.
                        White text, darker navy background.                  */}
                    {division && (
                      <tr data-row-type="division-header">
                        <td colSpan={totalCols} className={styles.divisionCell}>
                          <AcrosticText text={division} acronym="" />
                        </td>
                      </tr>
                    )}

                    {/* ── Row 2: Classification / Acronym row ───────────────
                        Title in gold (or white for acronyms).
                        Definition below in smaller text with acrostic letters
                        highlighted in white, rest in light gold.             */}
                    <tr data-row-type="program-header">
                      <td colSpan={totalCols} className={styles.programCell}>
                        <div className={styles.programTitle}>
                          <AcrosticText text={title} acronym={acronym || ''} />
                        </div>
                        {definition && (
                          <div className={styles.programDefinitionFlowing}>
                            <AcrosticText text={definition} acronym={acronym || ''} />
                          </div>
                        )}
                      </td>
                    </tr>

                    {/* ── Indicator groups ──────────────────────────────── */}
                    {program.groups.map((group, gi) => (
                      <React.Fragment key={gi}>

                        {/* Outcome / Output label row */}
                        {group.label && (
                          <tr data-row-type="group-label">
                            <td colSpan={totalCols} className={styles.groupLabelCell}>
                              {group.label}
                            </td>
                          </tr>
                        )}

                        {/* Indicator data rows */}
                        {group.rows.map((row, ri) => {
                          const isSubItem = /^[a-z]\.\s/.test(row.text.trim());

                          // Parent label row — spans all columns
                          if (row.isParentLabel) {
                            return (
                              <tr key={ri} data-row-type="parent-label">
                                <td colSpan={totalCols} className={styles.parentLabelCell}>
                                  {row.text}
                                </td>
                              </tr>
                            );
                          }

                          // Regular data row
                          return (
                            <tr key={ri} className={styles.indicatorRow}>

                              <td className={`${styles.indicatorCell} ${isSubItem ? styles.subItemCell : ''}`}>
                                {row.text}
                              </td>

                              <td className={styles.targetCell}>
                                <AnnualTargetCell target={row.annualTarget} />
                              </td>

                              <td className={styles.remarksCell}>
                                {row.targetRemarks || <span className={styles.na}>—</span>}
                              </td>

                              {sdosInThisSlide.map((sdo) => {
                                const val = row.sdoValues[sdo];
                                const isEmpty = !val || !val.raw;

                                const renderSdoValue = (raw: string) => {
                                  // Look for trailing parenthetical blocks like "(134/158)"
                                  const match = raw.match(/^(.*?)\s*(\(.*)$/);
                                  if (match && match[1]) {
                                    return (
                                      <>
                                        <span style={{ display: 'block' }}>{match[1].trim()}</span>
                                        <span style={{ display: 'block', fontSize: '0.82em', fontWeight: 'normal', color: '#64748b', marginTop: '2px', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.3' }}>
                                          {match[2].trim()}
                                        </span>
                                      </>
                                    );
                                  }
                                  return <span>{raw}</span>;
                                };

                                const rate = isIndividualSdoTab ? getAccomplishmentRate(val, row.annualTarget.ro, row.text) : null;

                                return (
                                  <td key={sdo} className={styles.sdoCell} style={{ color: '#0f172a' }}>
                                    {isEmpty ? (
                                      <span className={styles.na}>—</span>
                                    ) : (
                                      <>
                                        <div className={styles.sdoValue}>
                                          {renderSdoValue(val.raw)}
                                        </div>
                                        {rate && (
                                          <div style={{ color: '#dc2626', fontSize: '0.85em', marginTop: '4px', fontWeight: 'bold' }}>
                                            ({rate})
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </td>
                                );
                              })}

                              <td className={styles.remarksCell}>
                                {row.remarks || <span className={styles.na}>—</span>}
                              </td>

                            </tr>
                          );
                        })}

                      </React.Fragment>
                    ))}

                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.footer}>
        <span>DepEd Region IX | Project HAYAG</span>
      </div>
    </div>
  );
}
