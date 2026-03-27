# Project HAYAG: Department of Education Region IX Automated Monitoring Tool

Project HAYAG is a specialized reporting and data extraction system designed for the Department of Education (DepEd) Region IX. It streamlines the process of generating Performance Implementation Review (PIR) reports by directly pulling data from live Google Sheets and converting them into professional, presentation-ready PDF documents.

## Core Features

- **Live Google Sheets Integration**: Real-time data extraction using the Google Visualization (GViz) API to ensure reports always reflect the latest spreadsheet updates.
- **Hierarchical Data Parsing**: Advanced scanner that identifies Programs, Outcome Indicators, and Output Indicators from complex spreadsheet structures.
- **Dynamic SDO Grouping**: Ability to group Schools Division Offices (SDOs) for targeted reporting and analysis.
- **Professional PDF Engine**: Custom-built, row-aware PDF generator that ensures:
    - Accurate DepEd Region IX branding and typography.
    - Automatic title page generation with customizable event details.
    - Automated agenda/outline pages.
    - Multi-page table support with repeating headers and intelligent row-splitting.
    - Font optimization using 24px Arial for maximum readability in presentation settings.
- **Interactive Report Configuration**: A dedicated interface to input presentation dates, locations, and agenda items before document finalization.

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn
- Access to the target DepEd Region IX Monitoring Google Sheet

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/theSleepingKnight/HAYAG.git
   cd HAYAG
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
3. **Configure Report**: Use the dashboard to select the monitoring quarter and choose between PREXC and NON-PREXC sections.
4. **Generate PDF**:
    - Click the Download button for the desired SDO group.
    - Provide the presentation date and venue.
    - Customize the report agenda in the provided outline list.
    - Click Generate to receive the final branded PDF.

## Technical Architecture

The system is built on modern web technologies:

- **Frontend**: Next.js with React and TypeScript.
- **Styling**: Vanilla CSS with CSS Modules for scoped, performant design.
- **Data Engine**: Custom TypeScript parser for Google Sheets GViz output.
- **PDF Generation**: Integration of jsPDF and html2canvas with a custom pagination logic layer.

## Project Structure

- `src/app`: Next.js App Router pages and server actions.
- `src/components`: Reusable UI components including the Table Preview and Download Modal.
- `src/lib`: Core logic for data extraction, slide mapping, and PDF generation.
- `public`: Static assets including DepEd logos and branding elements.

## License

Internal use only for the Department of Education Region IX.
