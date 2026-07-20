# 📘 Project HAYAG — User & Developer Guide

> **H·A·Y·A·G** — *Holistic Analysis of Yearly Accomplishments and Governance*
> DepEd Region IX | Automated Report Slide Generator

---

## Table of Contents

1. [What is Project HAYAG?](#1-what-is-project-hayag)
2. [Getting Started](#2-getting-started)
3. [How to Use the App](#3-how-to-use-the-app)
   - [Step 1: Paste Your Google Sheets Link](#step-1-paste-your-google-sheets-link)
   - [Step 2: Sheet Scan Results](#step-2-sheet-scan-results)
   - [Step 3: PREXC Report Tab](#step-3-prexc-report-tab)
   - [Step 4: NON-PREXC Report Tab](#step-4-non-prexc-report-tab)
   - [Step 5: Generating & Downloading Slides](#step-5-generating--downloading-slides)
4. [Understanding the SDO Slide Builder](#4-understanding-the-sdo-slide-builder)
5. [Understanding the Status Color Badges](#5-understanding-the-status-color-badges)
6. [Google Sheets Format Requirements](#6-google-sheets-format-requirements)
7. [For Developers](#7-for-developers)

---

## 1. What is Project HAYAG?

Project HAYAG is a web-based tool that automatically reads accomplishment data from a **DepEd Region IX Google Sheets workbook** and generates clean, formatted **presentation slides** (PDF) for quarterly reporting.

It supports two types of data:
- **PREXC** — Programs, Results, and Expenditure Classification data from the `PREXC` tab
- **NON-PREXC** — Individual SDO-level accomplishment data from SDO-specific tabs (e.g. `Dap-NP2026`, `Sul-NP2026`, etc.)

---

## 2. Getting Started

### Prerequisites
- A valid DepEd Region IX Google Sheets workbook (shared with view access or publicly accessible)
- A modern browser (Chrome recommended)

### Running Locally (Developers)

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Live Version
The app is deployed on Vercel and auto-updates whenever the `main` branch is pushed to GitHub.

---

## 3. How to Use the App

### Step 1: Paste Your Google Sheets Link

On the home screen, paste the full URL of your Google Sheets workbook into the input field. The link should look like:

```
https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit#gid=...
```

Click the **Scan** button (or press Enter) to begin detection.

---

### Step 2: Sheet Scan Results

A modal will appear showing what was detected in the workbook:

| Item | What it means |
|------|---------------|
| ✅ **PREXC DATA** | The `PREXC` tab was found and is readable |
| ✅ **NON-PREXC DATA** | SDO-specific tabs ending in `-NP` were found (e.g. `9 SDO Sheets detected`) |
| ❌ **Not Found** | That data type was not detected in the workbook |

The **Detected** header will dynamically show:
- `PREXC & NON-PREXC` — both types found
- `PREXC ONLY` — only PREXC tab found
- `NON-PREXC ONLY` — only SDO sheets found
- `Nothing found` — no recognizable tabs found

Click **Continue** to proceed to the report builder.

---

### Step 3: PREXC Report Tab

The **PREXC REPORT** tab lets you configure and generate slides from the PREXC data.

#### Configure PREXC Layout (SDO Slide Builder)

The slide builder lets you control how SDOs are distributed across slides.

**Auto-Distribute buttons:**
- `2 Groups` — randomly splits all 9 SDOs across 2 slides
- `3 Groups` — splits across 3 slides
- `4 Groups` — splits across 4 slides

**Manual Assignment:**
- **Click** an SDO chip in the Tray to instantly assign it to Slide 1
- **Drag and drop** an SDO chip from the Tray into any slide group
- **Drag** an SDO back to the Tray to unassign it

**Clear Groupings** — resets all assignments and returns all SDOs to the Tray

#### Quarter Selector
Choose the reporting quarter: **Q1**, **Q2**, **Q3**, or **Q4** before generating slides.

#### Generate & Download
Once SDOs are assigned to slide groups, click **⬇ Download PDF** on any group to export that group's slides as a PDF.

---

### Step 4: NON-PREXC Report Tab

The **NON-PREXC REPORT** tab generates individual SDO accomplishment slides.

Use the **SDO selector** on the left side to switch between individual SDOs (e.g. Dapitan, Dipolog, Isabela, etc.).

Each SDO slide shows:
- Program/indicator rows with accomplishment values vs. targets
- Status color badges showing performance (see [Section 5](#5-understanding-the-status-color-badges))
- Remarks column

---

### Step 5: Generating & Downloading Slides

Click the **⬇ Download PDF** button on any slide group. A confirmation modal will appear asking you to confirm:
- The **Group Name** (e.g. `Group A`)
- The **Quarter** being reported

Click **Confirm Download** to generate and save the PDF to your computer.

> **Note:** PPTX export is coming soon and is not yet available.

---

## 4. Understanding the SDO Slide Builder

The SDO Slide Builder works like a **drag-and-drop kanban board**:

```
┌─────────────────────────────────────────────────┐
│  Auto-Distribute: [2 Groups] [3 Groups] [4 Groups]   [Clear Groupings] │
├─────────────────────────────────────────────────┤
│  Tray: Unassigned SDOs                          │
│  [Dapitan] [Dipolog] [Isabela] [Pagadian] ...   │
├──────────────┬──────────────┬───────────────────┤
│   Slide 1    │   Slide 2    │   Slide 3         │
│  [Dapitan]   │  [Pagadian]  │  [Zamboanga City] │
│  [Dipolog]   │  [Sibugay]   │                   │
└──────────────┴──────────────┴───────────────────┘
```

- SDO chips in the **Tray** are unassigned and won't appear in any slide
- Each **Slide group** represents one output presentation slide
- Click the `+` button at the bottom to reveal additional slide slots

---

## 5. Understanding the Status Color Badges

Both PREXC and NON-PREXC reports use the same color system for accomplishment percentage badges:

| Badge Color | Threshold | Meaning |
|-------------|-----------|---------|
| 🟢 **Green** | ≥ 90% | On track / Target met |
| 🟡 **Amber** | 70% – 89% | Near target / Monitor closely |
| 🔴 **Red** | < 70% | Below target / Needs attention |

These badges show the accomplishment rate as a percentage of the annual target.

---

## 6. Google Sheets Format Requirements

For the app to correctly read your data, the workbook must follow these conventions:

### PREXC Tab
- Sheet name must be exactly: **`PREXC`**
- Rows should follow the standard DepEd PREXC accomplishment report format

### NON-PREXC SDO Tabs
- Sheet names must end in **`-NP`** followed by the fiscal year (e.g. `Dap-NP2026`, `Sul-NP2026`)
- Supported SDO tab prefixes: `Dap`, `Dip`, `Isa`, `Pag`, `Sib`, `Sur`, `Tam`, `Zam`, `ZamCity`
- Each tab should follow the standard SDO accomplishment report format with targets and accomplishments

### Workbook Access
- The Google Sheet must be set to **"Anyone with the link can view"**
- Private or restricted sheets will not be accessible by the app

---

## 7. For Developers

### Project Structure

```
src/
├── app/
│   ├── actions.ts          # Server actions: Google Sheets API calls
│   ├── page.tsx            # Main dashboard page
│   ├── page.module.css     # Dashboard styles
│   ├── layout.tsx          # App metadata and fonts
│   └── globals.css         # Global CSS variables and utilities
├── components/
│   ├── SlidePreview.tsx         # Slide renderer (PREXC & NON-PREXC)
│   ├── SmartSlideBuilder.tsx    # SDO drag-and-drop grouping UI
│   ├── QuarterSelector.tsx      # Quarter tab switcher
│   ├── ReportGeneratorCard.tsx  # Google Sheets link input card
│   ├── SdoGrouping.tsx          # NON-PREXC SDO selector
│   ├── DetectionNotification.tsx # Sheet scan result modal
│   └── DownloadModal.tsx        # PDF download confirmation modal
└── lib/
    └── config.ts           # SDO list, default groups, constants
```

### Key Configuration (`src/lib/config.ts`)

- **`DEFAULT_SDOS`** — The list of all 9 SDO codes used by the slide builder
- **`SDO_LIST`** — Full SDO names and sheet tab codes for NON-PREXC
- **`EMPTY_GROUPS_STATE`** — Default empty slide group structure

### Environment Variables

No environment variables are required. The app reads Google Sheets using the **public Sheets API v4** via the spreadsheet's sharing URL.

### Deployment

The app is deployed via **Vercel** connected to the `main` branch of the GitHub repository. Every push to `main` triggers an automatic production deployment.

```bash
# To deploy manually via Vercel CLI
npx vercel --prod
```

---

*Last updated: July 2026 | DepEd Region IX — Project HAYAG*
