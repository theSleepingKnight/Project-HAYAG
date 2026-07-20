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
              {token}
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
  const { quarter, groupName, sdosInThisSlide, programSections, sectionTitle } = slide;
  
  // Conditionally disable Target & Remarks columns for PREXC and setup split-column math
  const isPrexcData = sectionTitle ? sectionTitle.toUpperCase().includes('PREXC') && !sectionTitle.toUpperCase().includes('NON') : false;
  // If PREXC, each SDO is split into 2 columns (Target | Actual). Total = 1 (Indicator) + length * 2
  const totalCols = isPrexcData ? (1 + sdosInThisSlide.length * 2) : (sdosInThisSlide.length + 4);
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
                <th className={styles.mainCol} rowSpan={isPrexcData ? 2 : 1}>INDICATORS / PPAS</th>
                {!isPrexcData && (
                  <>
                    <th className={styles.targetCol}>TARGET</th>
                    <th className={styles.remarksCol}>REMARKS (TARGET)</th>
                  </>
                )}
                {sdosInThisSlide.map((sdo) => (
                  <th key={sdo} className={styles.sdoCol} colSpan={isPrexcData ? 2 : 1}>
                    {sdo.includes('SDO ') ? (
                      <>
                        <span className={styles.sdoPrefix}>SDO</span>
                        <div className={styles.sdoMainName}>{sdo.replace('SDO ', '')}</div>
                      </>
                    ) : sdo}
                  </th>
                ))}
                {!isPrexcData && <th className={styles.remarksCol}>REMARKS</th>}
              </tr>
              {isPrexcData && (
                <tr className={styles.headerRow}>
                  {sdosInThisSlide.map((sdo) => (
                    <React.Fragment key={`${sdo}-sub`}>
                      <th className={styles.sdoCol} style={{ background: '#eab308', color: '#0f172a', fontSize: '0.85em', padding: '6px 4px', borderTop: 'none', borderRight: '1px solid #1e293b' }}>ACCOMPLISHMENT</th>
                      <th className={styles.sdoCol} style={{ background: '#f1f5f9', color: '#0f172a', fontSize: '0.85em', padding: '6px 4px', borderTop: 'none' }}>REMARKS</th>
                    </React.Fragment>
                  ))}
                </tr>
              )}
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
                          const isSubItem = /^([a-z]\.(?:[a-zA-Z0-9]{1,2}\.?)*\s|\d+(?:\.[a-zA-Z0-9]{1,2})+\.?\s|-)/.test(row.text.trim());

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

                              {!isPrexcData && (
                                <>
                                  <td className={styles.targetCell}>
                                    <AnnualTargetCell target={row.annualTarget} />
                                  </td>

                                  <td className={styles.remarksCell} style={{ textAlign: (row.targetRemarks || '').length < 40 ? 'center' : 'left' }}>
                                    {row.targetRemarks || <span className={styles.na}>—</span>}
                                  </td>
                                </>
                              )}

                              {sdosInThisSlide.map((sdo) => {
                                const val = row.sdoValues[sdo];
                                const isEmpty = isPrexcData 
                                  ? (!val || (!val.raw && !val.fraction))
                                  : (!val || !val.raw);

                                const renderSdoValue = (raw: string) => {
                                  const trimmed = raw.trim();
                                  if (trimmed.toLowerCase() === 'cmi') {
                                    return <span>—</span>;
                                  }
                                  // Look for trailing parenthetical blocks like "(134/158)"
                                  const match = trimmed.match(/^(.*?)\s*(\(.*)$/);
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
                                  return <span>{trimmed}</span>;
                                };

                                const rate = isIndividualSdoTab ? getAccomplishmentRate(val, row.annualTarget.ro, row.text) : null;

                                  const displayPercentage = val?.percentage;
                                  
                                  let pillColor = '#dc2626'; // Bold Red
                                  let pillBg = '#fef2f2';    // Light Red background

                                  if (displayPercentage !== null && displayPercentage !== undefined) {
                                    if (displayPercentage >= 90) {
                                      pillColor = '#16803d'; // Green
                                      pillBg = '#f0fdf4';
                                    } else if (displayPercentage >= 70) {
                                      pillColor = '#b45309'; // Amber
                                      pillBg = '#fef9c3';
                                    }
                                  } else if (rate) {
                                    const numRate = parseFloat(rate);
                                    if (!isNaN(numRate)) {
                                      if (numRate >= 90) {
                                        pillColor = '#16803d';
                                        pillBg = '#f0fdf4';
                                      } else if (numRate >= 70) {
                                        pillColor = '#b45309';
                                        pillBg = '#fef9c3';
                                      }
                                    }
                                  }


                                  if (isPrexcData) {
                                    // Determine badge colors based on percentage
                                    let badgeColor = '';
                                    let badgeBg = '';
                                    let badgeText = '';

                                    if (displayPercentage !== null && displayPercentage !== undefined) {
                                      badgeText = `${displayPercentage}%`;
                                      if (displayPercentage >= 90) {
                                        badgeColor = '#16803d'; // Green
                                        badgeBg = '#f0fdf4';
                                      } else if (displayPercentage >= 70) {
                                        badgeColor = '#b45309'; // Amber/Yellow
                                        badgeBg = '#fef9c3';
                                      } else {
                                        badgeColor = '#dc2626'; // Red
                                        badgeBg = '#fef2f2';
                                      }
                                    } else if (rate) {
                                      badgeText = rate;
                                      const numRate = parseFloat(rate);
                                      if (!isNaN(numRate)) {
                                        if (numRate >= 90) {
                                          badgeColor = '#16803d';
                                          badgeBg = '#f0fdf4';
                                        } else if (numRate >= 70) {
                                          badgeColor = '#b45309';
                                          badgeBg = '#fef9c3';
                                        } else {
                                          badgeColor = '#dc2626';
                                          badgeBg = '#fef2f2';
                                        }
                                      }
                                    }

                                    const rawTargetVal = val?.fraction ? val.fraction.trim() : '';
                                    const isTargetCmi = rawTargetVal.toLowerCase() === 'cmi';

                                    let rawAccomp = val?.raw ? val.raw.trim() : '';
                                    if (rawAccomp.toLowerCase() === 'cmi') {
                                      rawAccomp = '';
                                    }

                                    let rawTarget = rawTargetVal;
                                    if (isTargetCmi) {
                                      rawTarget = '';
                                    }

                                    // Safety check: If the accomplishment is blank or a dash, do not render a percentage rate
                                    if (!rawAccomp || rawAccomp === '-' || rawAccomp === '—') {
                                      badgeText = '';
                                      badgeColor = '';
                                      badgeBg = '';
                                    }

                                    return (
                                      <React.Fragment key={sdo}>
                                        {/* 1. Combined Accomplishment & Target Cell */}
                                        <td className={styles.sdoCell} style={{ color: '#000000' }}>
                                          {isEmpty ? (
                                            <span className={styles.na}>—</span>
                                          ) : isTargetCmi ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                              <span style={{ fontWeight: 'bold' }}>CMI</span>
                                            </div>
                                          ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                              {/* Top: Percentage Badge */}
                                              {badgeText ? (
                                                badgeColor ? (
                                                  <div style={{ 
                                                    color: badgeColor, 
                                                    fontSize: '11px', 
                                                    fontWeight: 'bold',
                                                    backgroundColor: badgeBg,
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    border: `1px solid ${badgeColor}bb`
                                                  }}>
                                                    {badgeText}
                                                  </div>
                                                ) : (
                                                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#000000' }}>{badgeText}</span>
                                                )
                                              ) : (
                                                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#000000' }}>-</span>
                                              )}

                                              {/* Middle: Accomp */}
                                              <div style={{ color: '#000000', marginTop: '2px', textAlign: 'center', lineHeight: '1.2' }}>
                                                <span style={{ fontWeight: 'bold' }}>Accomp:</span> {rawAccomp || '-'}
                                              </div>
                                              
                                              {/* Bottom: Target */}
                                              <div style={{ color: '#000000', textAlign: 'center', lineHeight: '1.2' }}>
                                                <span style={{ fontWeight: 'bold' }}>Target:</span> {rawTarget || '-'}
                                              </div>
                                            </div>
                                          )}
                                        </td>

                                        {/* 2. SDO Remarks Cell */}
                                        <td className={styles.sdoCell} style={{ 
                                          color: '#000000', 
                                          fontWeight: 'normal', 
                                          textAlign: (val?.remarks || '-').length < 40 ? 'center' : 'left',
                                          whiteSpace: 'normal',
                                          wordBreak: 'break-word',
                                          lineHeight: '1.3',
                                          padding: '8px'
                                        }}>
                                          {val?.remarks ? val.remarks : '-'}
                                        </td>
                                      </React.Fragment>
                                    );
                                  }

                                  return (
                                    <td key={sdo} className={styles.sdoCell} style={{ color: '#0f172a' }}>
                                      {isEmpty ? (
                                        <span className={styles.na}>—</span>
                                      ) : (
                                        <>
                                          <div className={styles.sdoValue}>
                                            {renderSdoValue(val.raw)}
                                          </div>
                                          {val.fraction && !isIndividualSdoTab && (
                                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', fontWeight: 'normal' }}>
                                              Goal: {val.fraction.trim().toLowerCase() === 'cmi' ? '-' : val.fraction}
                                            </div>
                                          )}
                                          {(displayPercentage !== null || rate) && (
                                            <div style={{ 
                                              color: pillColor, 
                                              fontSize: '11px', 
                                              marginTop: '6px', 
                                              fontWeight: 'bold',
                                              backgroundColor: pillBg,
                                              padding: '2px 6px',
                                              borderRadius: '4px',
                                              border: `1px solid ${pillColor}bb`,
                                              display: 'inline-block'
                                            }}>
                                              {displayPercentage !== null ? `${displayPercentage}%` : rate}
                                            </div>
                                          )}
                                        </>
                                      )}
                                    </td>
                                  );
                              })}

                              {!isPrexcData && (
                                <td className={styles.remarksCell} style={{ textAlign: (row.remarks || '').length < 40 ? 'center' : 'left' }}>
                                  {row.remarks || <span className={styles.na}>—</span>}
                                </td>
                              )}

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
