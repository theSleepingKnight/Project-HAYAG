# Contributing to Project HAYAG

Project HAYAG is the official DepEd Region IX Automated Monitoring Tool. To maintain high code quality and professional standards, please follow these guidelines when contributing.

## Programming Environment

- **Framework**: Next.js 15+ (App Router).
- **Language**: TypeScript (Strict Mode).
- **Styling**: Vanilla CSS with CSS Modules. Utility classes (e.g., Tailwind) should be used sparingly.
- **Node Version**: 18.x or higher is required.

## Development Workflow

1.  **Branching**: Always create a new branch for any feature or bug fix: `feature/your-feature-name` or `fix/issue-description`.
2.  **Coding Standards**:
    - Ensure all new components have a corresponding `.module.css` file.
    - Avoid hardcoding school division names; use the existing `SDO_COL_MAP` in `src/lib/data-engine-real.ts`.
    - Never bypass TypeScript errors with `any`.
3.  **PDF Generation**:
    - Any changes to the layout of the `SlidePreview` table must also be tested against the PDF Generator in `src/lib/pdf-generator.ts`.
    - Maintain the 1122px (96 DPI) width to prevent A4 landscape distortion.
4.  **Testing**:
    - Perform a full data extraction using the live Google Sheet before submitting a pull request.
    - Test PDF generation across different browsers (Chrome and Safari) to ensure consistency in html2canvas output.

## Documentation Requirements

- Update `README.md` if any new core features are added.
- Document any architectural changes in `docs/ARCHITECTURE.md`.
- **Important**: Do not use emojis in any official project documentation.

## Deployment Guidelines

- Environment variables for Google Sheets API integration should be configured in the production environment.
- Use `npm run build` to verify the project's build health before pushing significant changes.
- Ensure the DepEd Region IX branding (logos and colors) is preserved.

## Support

For technical inquiries, contact the Project HAYAG development lead for DepEd Region IX.
