import React, { useState } from 'react';
import styles from './SmartSlideBuilder.module.css';
import { DEFAULT_SDOS, EMPTY_GROUPS_STATE } from '@/lib/config';

interface SmartSlideBuilderProps {
  groups: Record<string, string[]>;
  setGroups: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
}

export default function SmartSlideBuilder({ groups, setGroups }: SmartSlideBuilderProps) {
  const groupKeys = Object.keys(EMPTY_GROUPS_STATE);
  
  // Find the last index that has items
  let lastActiveIndex = 0;
  groupKeys.forEach((key, idx) => {
    if (groups[key]?.length > 0) {
      lastActiveIndex = Math.max(lastActiveIndex, idx);
    }
  });

  const [visibleSlides, setVisibleSlides] = useState(Math.max(1, lastActiveIndex + 1));
  const [draggedSdo, setDraggedSdo] = useState<string | null>(null);

  // SDOs not present in any group
  const allAssigned = Object.values(groups).flat();
  const unassignedSdos = DEFAULT_SDOS.filter(sdo => !allAssigned.includes(sdo));

  const getEmptyState = () => {
    const fresh: Record<string, string[]> = {};
    groupKeys.forEach(k => fresh[k] = []);
    return fresh;
  };

  const moveToGroup = (sdo: string, targetGroup: string) => {
    setGroups(prev => {
      const next = getEmptyState();
      for (const k of groupKeys) {
        next[k] = [...(prev[k] || [])].filter(s => s !== sdo);
      }
      if (targetGroup) {
        next[targetGroup] = [...next[targetGroup], sdo].sort();
      }
      return next;
    });
  };

  const handleDragStart = (e: React.DragEvent, sdo: string) => {
    e.dataTransfer.setData('sdo', sdo);
    setDraggedSdo(sdo);
  };

  const handleDropToSlide = (e: React.DragEvent, groupName: string) => {
    e.preventDefault();
    const sdo = e.dataTransfer.getData('sdo');
    if (sdo) moveToGroup(sdo, groupName);
    setDraggedSdo(null);
  };

  const handleDropToTray = (e: React.DragEvent) => {
    e.preventDefault();
    const sdo = e.dataTransfer.getData('sdo');
    if (sdo) moveToGroup(sdo, '');
    setDraggedSdo(null);
  };

  const randomizeGroups = (numSlides: number) => {
    const shuffled = [...DEFAULT_SDOS].sort(() => Math.random() - 0.5);
    const next = getEmptyState();
    
    shuffled.forEach((sdo, i) => {
      const targetGroup = groupKeys[i % numSlides];
      next[targetGroup].push(sdo);
    });
    
    for (const k of Object.keys(next)) {
      next[k].sort();
    }
    
    setGroups(next);
    setVisibleSlides(numSlides);
  };

  const clearAll = () => {
    setGroups(getEmptyState());
    setVisibleSlides(1);
  };

  const isolateSdo = (sdo: string) => {
    setGroups(() => {
      const next = getEmptyState();
      next['Group A'] = [sdo];
      return next;
    });
    setVisibleSlides(1);
  };

  return (
    <div className={styles.container}>
        <div className={styles.presetsBar}>
          <span className={styles.presetLabel}>Auto-Distribute:</span>
          <button onClick={() => randomizeGroups(2)} className={styles.presetBtn}>2 Groups</button>
          <button onClick={() => randomizeGroups(3)} className={styles.presetBtn}>3 Groups</button>
          <button onClick={() => randomizeGroups(4)} className={styles.presetBtn}>4 Groups</button>
          <div style={{flex: 1}}></div>
          <button onClick={clearAll} className={styles.presetBtn} style={{ color: '#ef4444', borderColor: '#fca5a5' }}>
            Clear Groupings
          </button>
        </div>

       <div 
         className={styles.unassignedTray}
         onDragOver={e => e.preventDefault()}
         onDrop={handleDropToTray}
       >
         <h3 className={styles.trayHeader}>
           Tray: Unassigned SDOs <span style={{fontSize: '0.75rem', fontWeight: 'normal', color: '#94a3b8', marginLeft: '6px', textTransform: 'none'}}>(Click or drag-and-drop any SDO to assign it)</span>
         </h3>
         <div className={styles.chipContainer}>
           {unassignedSdos.map(sdo => (
             <div 
               key={sdo} 
               className={styles.chip}
               draggable
               onDragStart={(e) => handleDragStart(e, sdo)}
               onClick={() => moveToGroup(sdo, groupKeys[0])} // Fast click to slide 1
               onDoubleClick={() => isolateSdo(sdo)} // Instant isolate
               data-tooltip="💡 Double-click to isolate | Drag to group"
               style={{ opacity: draggedSdo === sdo ? 0.5 : 1 }}
             >
               {sdo}
             </div>
           ))}
           {unassignedSdos.length === 0 && (
             <span className={styles.emptyState} style={{border: 'none', padding: 0}}>All SDOs are currently assigned to slides.</span>
           )}
         </div>
       </div>

       <div className={styles.slidesGrid}>
         {groupKeys.slice(0, visibleSlides).map((groupName, i) => {
           const slideSdos = groups[groupName] || [];
           return (
             <div 
               key={groupName} 
               className={styles.slideCard}
               onDragOver={e => e.preventDefault()}
               onDrop={e => handleDropToSlide(e, groupName)}
             >
               <div className={styles.slideHeader}>
                 <h4 className={styles.slideTitle}>
                   Slide {i + 1} 
                   <span style={{fontSize: '0.75rem', fontWeight: 'normal', color: '#64748b', marginLeft: '4px'}}>({groupName})</span>
                 </h4>
                 <span className={styles.slideBadge}>{slideSdos.length} SDO{slideSdos.length !== 1 ? 's' : ''}</span>
               </div>
               <div className={styles.chipContainer} style={{flex: 1}}>
                 {slideSdos.map(sdo => (
                   <div 
                     key={sdo} 
                     className={`${styles.chip} ${styles.inSlide}`}
                     draggable
                     onDragStart={(e) => handleDragStart(e, sdo)}
                     onClick={() => moveToGroup(sdo, '')} // click kicks to tray
                     data-tooltip="Click to return to Tray | Drag to move"
                     style={{ opacity: draggedSdo === sdo ? 0.5 : 1 }}
                   >
                     {sdo}
                     <div className={styles.chipRemove}>✕</div>
                   </div>
                 ))}
                 {slideSdos.length === 0 && (
                   <div className={styles.emptyState}>Drag SDOs here</div>
                 )}
               </div>
             </div>
           );
         })}
         
         {visibleSlides < groupKeys.length && (
           <button 
             className={styles.addSlideBtn} 
             onClick={() => setVisibleSlides(v => v + 1)}
           >
             <span style={{fontSize: '1.5rem'}}>+</span>
             <span>Add Slide</span>
           </button>
         )}
       </div>
    </div>
  );
}
