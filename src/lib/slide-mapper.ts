/**
 * slide-mapper.ts — Project HAYAG
 *
 * Takes ProgramSection[] + user-defined SDO groups and returns SlideData[].
 * One slide is generated per SDO group — each slide contains ALL program
 * sections with their full indicator lists, filtered to only show the SDOs
 * assigned to that group.
 */

import { ProgramSection } from './data-engine';

export interface SlideData {
  type: 'data' | 'divider';
  // Divider fields
  sectionTitle?: string;
  // Data slide fields
  quarter: string;
  groupName: string;
  sdosInThisSlide: string[];       // SDO names for this group
  programSections: ProgramSection[]; // All programs, pre-filtered to this group's SDOs
}

/**
 * Maps structured program sections to slides, one per SDO group.
 *
 * @param programs  - extracted ProgramSection[] from data-engine-real
 * @param userGroups - e.g. { "Group A": ["SDO Dapitan City", ...], "Group B": [...] }
 * @param quarter   - e.g. "Q1"
 * @param sectionTitle - optional PREXC/NON-PREXC label for divider slide
 */
export function mapToSlides(
  programs: ProgramSection[],
  userGroups: Record<string, string[]>,
  quarter: string = 'Q1',
  sectionTitle?: string,
): SlideData[] {
  const slides: SlideData[] = [];

  // Add section divider if provided
  if (sectionTitle) {
    slides.push({
      type: 'divider',
      sectionTitle,
      quarter,
      groupName: '',
      sdosInThisSlide: [],
      programSections: [],
    });
  }

  // One slide per non-empty SDO group
  for (const [groupName, sdos] of Object.entries(userGroups)) {
    if (sdos.length === 0) continue;

    // Filter each program's indicator rows to only include SDO values for this group
    // (we pass the full ProgramSection but SlidePreview only renders sdosInThisSlide)
    slides.push({
      type: 'data',
      quarter,
      groupName,
      sdosInThisSlide: sdos,
      programSections: programs,
    });
  }

  return slides;
}
