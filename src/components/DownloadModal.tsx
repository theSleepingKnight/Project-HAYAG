'use client';

import React, { useState } from 'react';
import styles from './DownloadModal.module.css';

export interface PdfFormData {
  date: string;
  location: string;
  outlineItems: string[];
}

interface DownloadModalProps {
  isOpen: boolean;
  groupName: string;
  quarter: string;
  onConfirm: (data: PdfFormData) => void;
  onCancel: () => void;
}

export default function DownloadModal({
  isOpen,
  groupName,
  quarter,
  onConfirm,
  onCancel,
}: DownloadModalProps) {
  const today = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState(today);
  const [location, setLocation] = useState('');
  const [outlineItems, setOutlineItems] = useState<string[]>([
    'Status of Accomplishments per Program',
    'Analysis of Performance Gaps',
    'Recommendations and Action Plans',
  ]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setOutlineItems([...outlineItems, '']);
  };

  const handleRemoveItem = (index: number) => {
    setOutlineItems(outlineItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, value: string) => {
    const updated = [...outlineItems];
    updated[index] = value;
    setOutlineItems(updated);
  };

  const handleConfirm = () => {
    onConfirm({
      date,
      location,
      outlineItems: outlineItems.filter((item) => item.trim() !== ''),
    });
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className={styles.modal}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerIcon}>📄</div>
          <div>
            <h2 className={styles.title}>Generate PDF Report</h2>
            <p className={styles.subtitle}>{groupName} — {quarter} Monitoring Report</p>
          </div>
        </div>

        <div className={styles.body}>

          {/* Date & Location Row */}
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>
                <span className={styles.labelIcon}>📅</span>
                Date of Presentation
              </label>
              <input
                type="date"
                className={styles.input}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>
                <span className={styles.labelIcon}>📍</span>
                Location / Venue
              </label>
              <input
                type="text"
                className={styles.input}
                placeholder="e.g. DepEd Region IX, Pagadian City"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          {/* Outline Section */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <label className={styles.label}>
                  <span className={styles.labelIcon}>📋</span>
                  Report Agenda / Outline
                </label>
                <p className={styles.hint}>These will appear on the second page of the PDF as the agenda.</p>
              </div>
              <button className={styles.addBtn} onClick={handleAddItem}>
                + Add Item
              </button>
            </div>

            <div className={styles.outlineList}>
              {outlineItems.map((item, index) => (
                <div key={index} className={styles.outlineItem}>
                  <span className={styles.outlineNum}>{index + 1}</span>
                  <input
                    type="text"
                    className={styles.outlineInput}
                    value={item}
                    onChange={(e) => handleItemChange(index, e.target.value)}
                    placeholder={`Agenda item ${index + 1}...`}
                  />
                  <button
                    className={styles.removeBtn}
                    onClick={() => handleRemoveItem(index)}
                    title="Remove item"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {outlineItems.length === 0 && (
                <p className={styles.emptyHint}>No agenda items. Click "+ Add Item" to begin.</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onCancel}>
            Cancel
          </button>
          <button className={styles.generateBtn} onClick={handleConfirm}>
            ⬇ Generate PDF
          </button>
        </div>
      </div>
    </div>
  );
}
