# System Architecture: Project HAYAG

Project HAYAG is built with a focus on automatic data parsing, hierarchical transformation, and professional-grade PDF generation.

## 1. Data Ingestion Architecture

The application uses the Google Visualization (GViz) API to extract data directly from live Google Sheets.

### 1.1 GViz Endpoint Integration
The data extraction logic in `src/app/actions.ts` constructs a GViz URL with specific headers:
- `tqx=out:json`: Returns data in JSON format for easy parsing.
- `headers=0`: Prevents the API from automatically treating the first row as a header, ensuring the scanner can identify program titles at the start of the sheet.

### 1.2 Extraction Scanner (`src/lib/data-engine-real.ts`)
The scanner implements a robust state-machine-like approach to identify:
- **Program Sections**: Identified by bold text and specific spreadsheet patterns.
- **Outcome/Output Indicators**: Scanned by keywords.
- **Annual Targets**: Calculated as the sum of specific columns.
- **SDO Accomplishments**: Mapped using a predefined column-to-SDO matrix.

## 2. Transformation Pipeline

Raw spreadsheet data is transformed into a reporting-ready structure through the `SlideMapper` in `src/lib/slide-mapper.ts`.

### 2.1 Slide Data Structures
A `SlideData` object represents a logical unit of data to be displayed in the report. This includes:
- Program Title
- Sub-indicators
- Annual Targets (computed or literal)
- Group-specific SDO data points

## 3. PDF Generation Engine (`src/lib/pdf-generator.ts`)

The PDF generator is the most technically complex part of the system, using a hybrid approach of DOM-to-Canvas and direct jsPDF drawing.

### 3.1 Content Sizing
The engine captures hidden DOM elements at exactly 1122px width (A4 landscape at 96 DPI). This ensures a 1:1 pixel-to-point ratio without scaling distortion.

### 3.2 Row-Aware Pagination
To prevent table rows from being split across PDF pages, the generator:
- Pre-calculates the offset height of every row.
- Identifies clean break points within the `<tbody>`.
- Re-renders the `<thead>` at the top of every new page to maintain context.

### 3.3 Dynamic Auto-Fitting
For reports that marginally exceed a single page, the engine applies a slight vertical scale to fit the content onto one page, avoiding minor overflows while maintaining readability.

## 4. UI/UX Layer

The user interface is built using Next.js 15+ and Tailwind-compatible Vanilla CSS.

### 4.1 Component-Based Design
Key components such as `SlidePreview.tsx` and `DownloadModal.tsx` ensure that the visual representation of the report in the dashboard exactly matches the final PDF output.

### 4.2 State Management
The application manages current reporting sections (PREXC vs NON-PREXC), selected quarters, and SDO groupings using React states, enabling a reactive and real-time report configuration experience.
