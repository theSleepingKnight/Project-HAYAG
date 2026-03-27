'use client'

import { useState, useEffect } from 'react';
import styles from './SdoGrouping.module.css';

interface SdoGroupingProps {
  onGroupsChange?: (groups: Record<string, string[]>) => void;
}

export default function SdoGrouping({ onGroupsChange }: SdoGroupingProps) {
  const [groups, setGroups] = useState<Record<string, string[]>>({
    "Group A": [
      "SDO Dapitan City", "SDO Dipolog City", "SDO Isabela City",
      "SDO Pagadian City", "SDO Sulu", "SDO Zamboanga City",
      "SDO Zamboanga del Norte", "SDO Zamboanga del Sur", "SDO Zamboanga Sibugay",
    ],
    "Group B": [],
    "Group C": []
  });

  const [numGroups, setNumGroups] = useState(1);

  // 1. Load from persistence on mount
  useEffect(() => {
    const saved = localStorage.getItem('hayag_sdo_groups');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setGroups(parsed);
        // Auto-set numGroups based on active subsets
        if (parsed["Group C"]?.length > 0) setNumGroups(3);
        else if (parsed["Group B"]?.length > 0) setNumGroups(2);
      } catch (e) {
        console.error("Failed to load saved groupings:", e);
      }
    }
  }, []);

  // 2. Sync groups to parent + persist to localStorage
  useEffect(() => {
    if (onGroupsChange) {
      onGroupsChange(groups);
    }
    localStorage.setItem('hayag_sdo_groups', JSON.stringify(groups));
  }, [groups, onGroupsChange]);

  const randomizeAll = () => {
    const all = Object.values(groups).flat();
    const shuffled = [...all].sort(() => Math.random() - 0.5); // Fast shuffle
    
    // Split into 3 if numGroups=3, else 2
    if (numGroups === 3) {
      const third = Math.ceil(shuffled.length / 3);
      setGroups({
        "Group A": shuffled.slice(0, third),
        "Group B": shuffled.slice(third, third * 2),
        "Group C": shuffled.slice(third * 2)
      });
    } else {
      const half = Math.ceil(shuffled.length / 2);
      setGroups({
        "Group A": shuffled.slice(0, half),
        "Group B": shuffled.slice(half),
        "Group C": []
      });
    }
  };

  const autoSplitByThree = () => {
    const allSdos = Object.values(groups).flat();
    setGroups({
      "Group A": allSdos.slice(0, 3),   // 3x3 for 9 SDOs
      "Group B": allSdos.slice(3, 6),
      "Group C": allSdos.slice(6)
    });
    setNumGroups(3);
  };

  const autoSplitByTwo = () => {
    const allSdos = Object.values(groups).flat();
    setGroups({
      "Group A": allSdos.slice(0, 5),   // 5+4 for 9 SDOs
      "Group B": allSdos.slice(5),
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
          <button onClick={randomizeAll} className={styles.presetBtn} style={{ background: '#f59e0b', color: 'white' }}>🎲 Random Shuffle</button>
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
                    <span className={styles.sdoName}>{sdo}</span>
                    <select 
                      className={styles.moveSelect}
                      value={groupName}
                      onChange={(e) => moveToGroup(sdo, groupName, e.target.value)}
                    >
                      <option value="Group A">Group A</option>
                      <option value="Group B">Group B</option>
                      <option value="Group C">Group C</option>
                    </select>
                  </div>
                ))}
                {sdos.length === 0 && <div className={styles.emptyZone}>Empty</div>}
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  );

  function moveToGroup(sdo: string, from: string, to: string) {
    if (from === to) return;
    setGroups(prev => {
      const next = { ...prev };
      next[from] = next[from].filter(s => s !== sdo);
      next[to] = [...next[to], sdo].sort(); // Keep alpha sorted for neatness
      return next;
    });
  }
}
