import Image from 'next/image';
import styles from '@/app/page.module.css';

interface ReportGeneratorCardProps {
  sheetLink: string;
  setSheetLink: (link: string) => void;
  isDetecting: boolean;
  cooldown: number;
  onExtract: () => void;
}

export default function ReportGeneratorCard({ 
  sheetLink, 
  setSheetLink, 
  isDetecting, 
  cooldown, 
  onExtract 
}: ReportGeneratorCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.logoContainer}>
        <Image 
          src="/deped-region9.png" 
          alt="DepEd Region IX Logo" 
          width={75} 
          height={75} 
          priority
          className={styles.regionLogo} 
        />
        <div className={styles.logoArea}>
          <div className={styles.divider}></div>
          <span>DEPED REGION IX</span>
          <div className={styles.divider}></div>
        </div>
      </div>
      
      <h1 className={styles.title}>H·A·Y·A·G</h1>
      <p className={styles.subtitle}>Holistic Analysis of Yearly Accomplishments and Governance</p>
      <div className={styles.appLabel}>Report Generator</div>
      
      <div className={styles.inputGroup}>
        <input 
          type="text" 
          className={styles.inputField} 
          placeholder="Paste Google Sheet Link..." 
          value={sheetLink} 
          onChange={(e) => setSheetLink(e.target.value)} 
        />
      </div>
      
      {cooldown > 0 && (
        <div className={styles.cooldownLabel}>Please wait {cooldown}s before extracting again</div>
      )}
      
      <button 
        className={styles.actionButton} 
        onClick={onExtract} 
        disabled={isDetecting || cooldown > 0}
      >
        {isDetecting ? 'Scanning Sheets...' : 'Begin Extraction'}
      </button>
    </div>
  );
}
