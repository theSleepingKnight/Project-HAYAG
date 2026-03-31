'use client'

import { useState, useEffect } from 'react';
import styles from './SdoGrouping.module.css';

interface SdoGroupingProps {
  onGroupsChange?: (groups: Record<string, string[]>) => void;
  hasData: boolean;
}

export default function SdoGrouping({ onGroupsChange, hasData }: SdoGroupingProps) {
  const [groups, setGroups] = useState<Record<string, string[]>>({
    "Group A": [],
    "Group B": [],
    "Group C": []
  });

  const [numGroups, setNumGroups] = useState(1);

  // 1. Initial Load: If hasData is true, we populate the initial names
  useEffect(() => {
    if (!hasData) {
      setGroups({
        "Group A": [],
        "Group B": [],
        "Group C": []
      });
      return;
    }

    // Default Region IX SDOs
    const defaultSdos = [
      "SDO Dapitan City", "SDO Dipolog City", "SDO Isabela City",
      "SDO Pagadian City", "SDO Sulu", "SDO Zamboanga City",
      "SDO Zamboanga del Norte", "SDO Zamboanga del Sur", "SDO Zamboanga Sibugay",
    ];

    const saved = localStorage.getItem('hayag_sdo_groups');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure we don't accidentally load an empty state from storage
        const hasSavedItems = Object.values(parsed as Record<string, string[]>).some(arr => arr.length > 0);
        if (hasSavedItems) {
          setGroups(parsed);
          if (parsed["Group C"]?.length > 0) setNumGroups(3);
          else if (parsed["Group B"]?.length > 0) setNumGroups(2);
          return;
        }
      } catch (e) {
        console.error("Failed to load saved groupings:", e);
      }
    }

    // If no saved data, use the Region IX defaults in Group A
    setGroups({
      "Group A": defaultSdos,
      "Group B": [],
      "Group C": []
    });
  }, [hasData]);

  // 2. Sync groups to parent + persist to localStorage (only if we HAVE data)
  useEffect(() => {
    if (hasData && onGroupsChange) {
      onGroupsChange(groups);
      
      const hasSomething = Object.values(groups).some(arr => arr.length > 0);
      if (hasSomething) {
        localStorage.setItem('hayag_sdo_groups', JSON.stringify(groups));
      }
    }
  }, [groups, onGroupsChange, hasData]);

  const randomizeTwoGroups = () => {
    const all = Object.values(groups).flat();
    const shuffled = [...all].sort(() => Math.random() - 0.5);
    const half = Math.ceil(shuffled.length / 2);
    setGroups({
      "Group A": shuffled.slice(0, half),
      "Group B": shuffled.slice(half),
      "Group C": []
    });
    setNumGroups(2);
  };

  const randomizeThreeGroups = () => {
    const all = Object.values(groups).flat();
    const shuffled = [...all].sort(() => Math.random() - 0.5);
    const third = Math.ceil(shuffled.length / 3);
    setGroups({
      "Group A": shuffled.slice(0, third),
      "Group B": shuffled.slice(third, third * 2),
      "Group C": shuffled.slice(third * 2)
    });
    setNumGroups(3);
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerArea}>
        <h2 className={styles.title}>SDO Monitoring Grouping</h2>
        {hasData && (
          <div className={styles.presets}>
            <button onClick={randomizeTwoGroups} className={styles.presetBtn} style={{ background: '#f59e0b', color: 'white' }}>🎲 Randomize (2 Groups)</button>
            <button onClick={randomizeThreeGroups} className={styles.presetBtn} style={{ background: '#f59e0b', color: 'white' }}>🎲 Randomize (3 Groups)</button>
          </div>
        )}
      </div>

      <div className={styles.layout}>
        {!hasData ? (
          <div className={styles.placeholder}>
            <div className={styles.placeholderIcon}>🔧</div>
            <p>Paste a Google Sheet link above to configure your SDO groups here.</p>
          </div>
        ) : (
          Object.entries(groups).map(([groupName, sdos], index) => (
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
          ))
        )}
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
