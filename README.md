# Project HAYAG: Department of Education Region IX Automated Monitoring Tool

PDF & PPTX Generator for DepEd Region IX to be used by the Policy, Program, & Research Division (PPRD) and the Quality Assurance Division (QAD) in the conduct of Performance Implementation Review (PIR).

Project HAYAG is a specialized reporting and data extraction system designed for the Department of Education (DepEd) Region IX. It streamlines the process of generating reports by directly pulling data from live Google Sheets and converting them into professional, presentation-ready PDF documents and editable PowerPoint slides.

## Core Features

- **Live Google Sheets Integration**: Real-time data extraction using the Google Sheets API to ensure reports always reflect the latest spreadsheet updates.
- **Hierarchical Data Parsing**: Advanced scanner that identifies Programs, Outcome Indicators, and Output Indicators from complex spreadsheet structures with smart fallback detection.
- **Dynamic SDO Performance Tracking**: Automatically calculates and displays SDO accomplishment percentages against Regional Office (RO) targets for individual reports.
- **Smart Report Layout**: Intelligently handles table pagination in PDF exports, ensuring headers and data stay grouped across page breaks.
- **Professional PDF Engine**: Custom-built, row-aware PDF generator with DepEd Region IX branding.
- **Persistent Rate Limiting**: Built-in protection against API over-usage using Vercel KV/Redis for secure production deployments.

## Deployment Requirements

To deploy Project HAYAG to a production environment (like Vercel), ensure the following are configured:

1. **Google Service Account**: Set `GOOGLE_CLIENT_EMAIL` and `GOOGLE_PRIVATE_KEY` in your environment variables.
2. **Vercel KV (Redis)**: Connect a KV instance via the Vercel Storage dashboard to enable persistent session and rate-limit tracking.
3. **Domain Whitelisting**: Ensure your deployment domain is authorized in your Google Cloud Console.

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn
- Access to the target DepEd Region IX Monitoring Google Sheet

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/theSleepingKnight/Project-HAYAG.git
   cd Project-HAYAG
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`.

## Usage Guide

1. **Enter Sheet URL**: Paste the link to the live Google Sheet containing the monitoring data.
2. **Extract Data**: Click the Begin Extraction button to allow the system to parse the spreadsheet hierarchy.
3. **Configure Report**: Use the dashboard to select the monitoring quarter and choose between PREXC, NON-PREXC, or Combined sections.
4. **Generate Reports**:
    - Click **⬇ PDF Report** or **⬇ PPTX Slides** for the desired SDO group.
    - Provide the presentation date and venue.
    - Customize the report agenda in the provided outline list.
    - Click Generate to receive the final branded document.

## Technical Architecture

The system is built on modern web technologies:

- **Frontend**: Next.js with React and TypeScript.
- **Styling**: Vanilla CSS with CSS Modules for scoped, performant design.
- **Data Engine**: Custom TypeScript parser for Google Sheets GViz output.
- **PDF/PPTX Generation**: Integration of jsPDF, PptxGenJS, and html2canvas.

## Project Structure

- `src/app`: Next.js App Router pages and server actions.
- `src/components`: Reusable UI components including the Table Preview and Download Modal.
- `src/lib`: Core logic for data extraction, slide mapping, and report generation.
- `public`: Static assets including DepEd logos and branding elements.

## License

Internal use only for the Department of Education Region IX.
