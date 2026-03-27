'use server'

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { SlideData } from '@/lib/slide-mapper';

/**
 * Google Slides Export Action for Project HAYAG
 * Creates a real, editable presentation in Google Drive.
 */
export async function createGoogleSlidesReport(slidesData: SlideData[], title: string) {
  try {
    // 1. AUTHENTICATION (Explicit Load for Windows Paths)
    const keyPath = path.join(process.cwd(), 'config', 'project-hayag-6857969411a7.json');
    const keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

    const auth = new google.auth.JWT(
      keyFile.client_email,
      undefined,
      keyFile.private_key,
      ['https://www.googleapis.com/auth/presentations', 'https://www.googleapis.com/auth/drive']
    );

    const slides = google.slides({ version: 'v1', auth });
    const drive = google.drive({ version: 'v3', auth });

    // 2. CREATE PRESENTATION
    const presentation = await slides.presentations.create({
      requestBody: { title }
    });
    const presentationId = presentation.data.presentationId!;

    console.log(`🚀 Created Presentation ID: ${presentationId}`);

    // 3. GENERATE BATCH REQUESTS
    const requests: any[] = [];
    
    // Skip the first default slide or use it as a title slide
    // Let's create new slides for each data item
    slidesData.forEach((slide, index) => {
      const slideId = `slide_custom_${index}`;
      
      // Create Slide
      requests.push({
        createSlide: {
          objectId: slideId,
          insertionIndex: index + 1,
          slideLayoutReference: { predefinedLayout: 'BLANK' }
        }
      });

      if (slide.type === 'divider') {
        // Add Section Header
        const shapeId = `shape_div_${index}`;
        requests.push({
          createShape: {
            objectId: shapeId,
            shapeType: 'RECTANGLE',
            elementProperties: {
              pageObjectId: slideId,
              size: { width: { magnitude: 6000000, unit: 'EMU' }, height: { magnitude: 1000000, unit: 'EMU' } },
              transform: { scaleX: 1, scaleY: 1, translateX: 500000, translateY: 1500000, unit: 'EMU' }
            }
          }
        }, {
          updateShapeProperties: {
            objectId: shapeId,
            shapeProperties: {
              shapeBackgroundFill: { solidFill: { color: { rgbColor: { red: 0.11, green: 0.21, blue: 0.36 } } } }
            },
            fields: 'shapeBackgroundFill.solidFill.color'
          }
        }, {
          insertText: {
            objectId: shapeId,
            text: slide.sectionTitle || 'Section Title',
            insertionIndex: 0
          }
        });
      } else {
        // Create Comparison Table
        const tableId = `table_${index}`;
        const numSdos = slide.sdosInThisSlide.length;
        const numRows = 2 + slide.programSections.reduce((acc, p) => acc + p.groups.reduce((acc2, g) => acc2 + g.rows.length, 0), 0);
        
        requests.push({
          createTable: {
            objectId: tableId,
            elementProperties: { pageObjectId: slideId },
            rows: Math.min(numRows, 20), // Cap for safety in this version
            columns: 3 + numSdos
          }
        });
        
        // Headers (Simplified mapping for now)
        requests.push({
          insertText: { objectId: tableId, cellLocation: { rowIndex: 0, columnIndex: 0 }, text: "INDICATOR" }
        });
      }
    });

    // 4. EXECUTE BATCH UPDATE
    if (requests.length > 0) {
      await slides.presentations.batchUpdate({
        presentationId,
        requestBody: { requests }
      });
    }

    // 5. SET PERMISSIONS (Make it accessible via link)
    // Note: Depends on organization settings. This makes it readable by anyone with link.
    try {
      await drive.permissions.create({
        fileId: presentationId,
        requestBody: { role: 'reader', type: 'anyone' }
      });
    } catch (e) {
      console.warn("Could not set public permissions. Slide will be private to the service account.");
    }

    return { 
      success: true, 
      message: "Presentation generated successfully!",
      link: `https://docs.google.com/presentation/d/${presentationId}/edit`
    };

  } catch (error: any) {
    // EXTRA LOGGING: Reveal the exact nested error from Google
    if (error.response && error.response.data && error.response.data.error) {
      console.error("🔴 GOOGLE API ERROR DETAILS:", JSON.stringify(error.response.data.error, null, 2));
    } else {
      console.error("Slides Export Error:", error);
    }
    return { 
      success: false, 
      message: error.message || "Failed to create Google Slides. Check API configuration." 
    };
  }
}
