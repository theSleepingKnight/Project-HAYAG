# Project HAYAG: User Guide

Follow these steps to generate professional monitoring reports using the Project HAYAG system.

---

## Phase 1: Preparing the Google Sheet

Project HAYAG reads data directly from live Google Sheets. You must first ensure your PIR RMETA data is uploaded and shared correctly.

### 1. Upload and Convert
*   Upload your **PIR RMETA** Excel file (.xlsx) to your Google Drive.
*   Open the file in Google Drive.
*   Go to **File > Save as Google Sheets**. 
    > [!IMPORTANT]
    > The system can only read native Google Sheets. Do not try to use the raw Excel file link.

### 2. Grant Access (Security Setup)
The Project HAYAG "Extractor" needs permission to read your private sheet.
*   Open your Google Sheet.
*   Click the **Share** button in the top right corner.
*   In the "Add people and groups" box, paste the following service account email:
    `hayag-extractor@project-hayag-security.iam.gserviceaccount.com`
*   Ensure the role is set to **Viewer**.
*   Click **Send** (you can uncheck "Notify people").

---

## Phase 2: Connecting to Project HAYAG

### 3. Extract the Data
*   Copy the full URL of your Google Sheet from your browser's address bar.
*   Open the **Project HAYAG** web application.
*   Paste the URL into the search box.
*   Click **Begin Extraction / Scan Sheet**.
    *   The system will now scan all tabs to detect your PREXC and NON-PREXC data.
    *   Once detection is successful, specialized mapping buttons will appear.

---

## Phase 3: Generating Reports

### 4. Configure Your Report
*   **Select Section**: Choose between the **PREXC** or **NON-PREXC** reporting tabs.
*   **Select Quarter**: Choose the monitoring period (Q1, Q2, Q3, or Q4).
*   **SDO Grouping**: If you are in the PREXC section, you can group specific SDOs into a single report for comparison.

### 5. Preview & Export
*   Review the **Comparison Table Preview** on the dashboard.
    *   Check that headers and SDO accomplishment values are correct.
    *   Note the red percentage values indicating performance vs. target.
*   Click **⬇ PDF Report**.
*   A configuration modal will appear:
    *   **Date & Location**: Enter the venue and date of the PIR.
    *   **Agenda Items**: Customize the list of topics that will appear on the report's second page.
*   Click **Generate**.

---

## Phase 4: Best Practices & Troubleshooting

*   **Column Names**: Ensure the header row in your spreadsheet contains the word **"REMARKS"** and **"TARGET"**. The system relies on these keywords to map data accurately.
*   **Access Denied**: If you see a "Permission Denied" error, double-check that you shared the sheet with `hayag-extractor@...` and that the sheet link is correct.
*   **Formatting**: For individual SDO reports, ensure your tabs follow the naming convention ending in `-NP` (e.g., `Dap-NP2026`) for automatic detection.

---

**Project HAYAG | DepEd Region IX**
