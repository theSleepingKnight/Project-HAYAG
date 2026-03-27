'use client'

import { useState, useEffect } from 'react';
import styles from './SdoGrouping.module.css';

interface SdoGroupingProps {
  onGroupsChange?: (groups: Record<string, string[]>) => void;
}

export default function SdoGrouping({ onGroupsChange }: SdoGroupingProps) {
  const [groups, setGroups] = useState<Record<string, string[]>>({
    "Group A": [
      "SDO Dapitan City",
      "SDO Dipolog City",
      "SDO Isabela City",
      "SDO Pagadian City",
      "SDO Sulu",
      "SDO Zamboanga City",
      "SDO Zamboanga del Norte",
      "SDO Zamboanga del Sur",
    ],
    "Group B": [],
    "Group C": []
  });

  const [numGroups, setNumGroups] = useState(1);

  // Sync only ONCE on mount and when grouping state changes
  // Using a JSON string as a stable key to prevent re-renders when content is identical
  useEffect(() => {
    if (onGroupsChange) {
      onGroupsChange(groups);
    }
  }, [groups, onGroupsChange]);

  const autoSplitByThree = () => {
    const allSdos = Object.values(groups).flat();
    setGroups({
      "Group A": allSdos.slice(0, 3),
      "Group B": allSdos.slice(3, 6),
      "Group C": allSdos.slice(6, 9)
    });
    setNumGroups(3);
  };

  const autoSplitByTwo = () => {
    const allSdos = Object.values(groups).flat();
    setGroups({
      "Group A": allSdos.slice(0, 4),
      "Group B": allSdos.slice(4, 9),
      "Group C": []
    });
    setNumGroups(2);
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerArea}>
        <h2 className={styles.title}>SDO Monitoring Grouping</h2>
        <div className={styles.presets}>
          <button onClick={autoSplitByTwo} className={styles.presetBtn}>[ 2 Groups ]</button>
          <button onClick={autoSplitByThree} className={styles.presetBtn}>[ 3 Groups ]</button>
        </div>
      </div>

      <div className={styles.layout}>
        {Object.entries(groups).map(([groupName, sdos], index) => (
          (index < numGroups || sdos.length > 0) && (
            <div key={groupName} className={styles.groupZone}>
              <h3 className={styles.groupLabel}>{groupName}</h3>
              <div className={styles.sdoList}>
                {sdos.map((sdo) => (
                  <div key={sdo} className={styles.sdoCard}>
                    {sdo}
                    <span className={styles.dragHandle}>⠿</span>
                  </div>
                ))}
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  );
}
