# GVBL Laboratory Daily Operations Management System

**Genomic Valley Bharat Pvt. Ltd.** — *Where Health Meets Innovation*
Department: **NGS Laboratory**

A web application that replaces the handwritten *Daily Laboratory Operations Report*. Staff fill in the same
13 sections as the paper form. Reports are saved to a PostgreSQL database and can be searched, edited and
verified. Each report can be downloaded or printed as an A4 PDF laid out like the original form, and any set
of reports can be exported to Excel.

> **No login.** Anyone who can open the app can create, edit, verify, delete and restore reports. Names are
> typed into the form or dialog and recorded in the audit trail. Run it **only on the laboratory's internal
> network** (or behind a VPN / reverse-proxy with access control) — never expose it directly to the internet.

---

## Contents

1. [Features](#1-features)
2. [Running it locally](#2-running-it-locally)
3. [How the database works](#3-how-the-database-works)
4. [How PDF generation works](#4-how-pdf-generation-works)
5. [How Excel export works](#5-how-excel-export-works)
6. [Who did what — names instead of accounts](#6-who-did-what--names-instead-of-accounts)
7. [Deploying to production](#7-deploying-to-production)
8. [Maintenance tasks](#8-maintenance-tasks)
9. [Project structure — every file](#9-project-structure--every-file)

---

## 1. Features

| Area | What it does |
|---|---|
| **Daily report form** | All 13 sections of the paper form. Unlimited rows for Sample Details, Kits/Reagents Used and Consumables Received (add, remove, reorder). Day is filled automatically from the date. Signature can be drawn with mouse, finger or stylus. |
| **Saving** | **SAVE REPORT** (status *Completed*) and **Save as Draft**. A double-click never creates duplicates. If two people edit the same report at once, the second save is refused with a clear message instead of overwriting. Warns before leaving the page with unsaved changes. |
| **Validation** | Only Date and Prepared By are mandatory. Follow-up fields are required only when relevant (e.g. *Details* when Issues = Yes, *Specify* when Other is ticked). Duplicate Sample IDs are flagged. Errors appear next to the field. |
| **Report numbers** | Automatic and unique: `GVBL-NGS-2026-0001`, `GVBL-NGS-2026-0002`, … restarting each year. Safe when several people save at the same moment. |
| **Statuses** | Draft → Completed → Verified. Editing a verified report clears the verification. |
| **Report History** | Report No., Date, Prepared By, Samples Received, Samples Processed, Activities, Status, Created At, Updated At, and View / Edit / Generate PDF / Download PDF actions. Search by report number, date (dd/mm/yyyy), person, Sample ID or project; filter by status, sample type, sample status. |
| **Date filters** | All Records, Today, Yesterday, This Week, This Month, Selected Date, Custom Range (From must be on or before To). |
| **PDF** | Generate (opens in a new tab), Download, and **Print Report** (prints the very same A4 PDF). |
| **Excel** | Export the current filters, any date range, or ticked rows. Separate sheets for reports, samples, kits and consumables. |
| **Dashboard** | Today's received / processed / completed / under-processing / pending samples; report counts by status and this month; charts for the last 14 days, the last 12 months and activity frequency; recent reports and open drafts. |
| **Data safety** | Delete is a *soft* delete with a mandatory reason — the report stays in the database and can be restored. Every create, update, verify, delete, restore, PDF and export is written to the Audit Trail. |
| **Demo data** | Optional demo reports, clearly labelled *Demo*, removable with one command. |

---

## 2. Running it locally

### Requirements

- **Node.js 20.9 or newer** (`node -v`)
- **PostgreSQL 14 or newer** — easiest via Docker Desktop, or a normal PostgreSQL installation

### Steps

```bash
# 1. Unzip and enter the project
cd gvbl-lab-ops

# 2. Start PostgreSQL (skip if you already have one running)
docker compose up -d

# 3. Create your settings file
cp .env.example .env
#    If you use your own PostgreSQL, edit DATABASE_URL in .env

# 4. Install dependencies (also generates the Prisma database client)
npm install

# 5. Create the tables
npm run db:deploy

# 6. (Optional) Load demo reports so the dashboard has something to show
npm run db:seed

# 7. Start the app
npm run dev
```

Open **http://localhost:3000**. There is no sign-in; you land on the dashboard.

To try it from other computers on the lab network, run `npm run build && npm run start` and open
`http://<this-computer's-IP>:3000` on the other machine.

### Settings (`.env`)

| Variable | Meaning | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | the docker-compose database |
| `NEXT_PUBLIC_APP_TIMEZONE` | Time zone for "Today", "This Week", and times in PDFs/Excel | `Asia/Kolkata` |
| `REPORT_NUMBER_PREFIX` | Prefix of report numbers | `GVBL-NGS` |
| `SEED_DEMO_DATA` | `false` makes `npm run db:seed` do nothing | `true` |

### Useful commands

| Command | Purpose |
|---|---|
| `npm run dev` | Development server with live reload |
| `npm run build` / `npm run start` | Production build / run it |
| `npm run typecheck` | TypeScript check |
| `npm run db:deploy` | Apply database migrations (safe to run repeatedly) |
| `npm run db:migrate` | *Developers:* create a new migration after changing `prisma/schema.prisma` |
| `npm run db:seed` | Insert demo reports (only if none exist) |
| `npm run db:remove-demo` | Permanently remove all demo reports (asks for confirmation) |
| `npm run db:studio` | Browse the raw database tables in a browser |

---

## 3. How the database works

The data is **relational**: each part of the report lives in its own table, linked by the report's ID. Nothing
is stored as a single text blob and nothing is kept in the browser. The structure is defined in
`prisma/schema.prisma`, and `prisma/migrations/` holds the SQL that creates it.

```
reports ─┬─< samples                 (2. Sample Details — one row per sample)
         ├─< kits_reagents_used      (5. Kits / Reagents Used — one row per kit)
         └─< consumables_received    (6. Consumables / Reagents Received — one row per item)

report_counters                      (last report number used, per year)
audit_logs                           (history of every action)
```

| Table | Contents |
|---|---|
| `reports` | One row per daily report. It holds the header (report no., date, day, department, prepared by, notes) and all single-value fields of sections 1, 3, 4, 7–13. It also has status, verification (name, signature, time), `created_by_name` / `updated_by_name`, soft-delete fields (`deleted_at`, `deleted_by_name`, `delete_reason`) and the `is_demo` flag. Activities are stored as a list of keys. |
| `samples` | Sample ID, project/institute, type (+ "other" text), current status, received from, sent to, coordinated by, remarks, and `position` (row order). |
| `kits_reagents_used` | Name, lot no., quantity used, position. |
| `consumables_received` | Item name, batch/lot/catalogue no., invoice details, supplier, position. |
| `report_counters` | One row per year with the last sequence number used. |
| `audit_logs` | Action, report number, who (name), when, IP address and a JSON summary of what changed (for edits: which fields changed from what to what). |

**How saving works:**
- Creating or editing a report runs as one **database transaction**. The report and all its sample, kit and
  consumable rows are saved together, or not at all.
- Report numbers come from `report_counters` inside that transaction, so two simultaneous saves always get
  different numbers. `report_no` is also a unique column as a final safeguard.
- Each save from the browser carries a one-off request ID. If the same save arrives twice (double-click,
  network retry), the existing report is returned instead of a duplicate.
- An edit is only accepted if the report hasn't changed since the editor opened it. Otherwise the user is told
  to reload.
- Deleting sets `deleted_at` instead of removing the row. Deleted reports are hidden from history, the
  dashboard and exports, but remain viewable (tick *Include deleted reports* in Report History) and restorable.

**Changing the database structure later:** edit `prisma/schema.prisma`, run `npm run db:migrate -- --name
describe_change` on a development machine, commit the new folder in `prisma/migrations/`, and run
`npm run db:deploy` on the server.

**Backups:** use PostgreSQL's standard tools, e.g. a nightly
`pg_dump -Fc -d "$DATABASE_URL" -f gvbl_$(date +%F).dump`, stored on a different machine.

---

## 4. How PDF generation works

`src/lib/pdf/report-pdf.ts` draws the PDF with **PDFKit** on the server. It is rendered fresh from the
database every time, so the PDF always matches the saved report.

1. The browser calls `GET /api/reports/{id}/pdf`. Adding `?download=1` makes it download instead of opening.
2. The route loads the report with all its rows and passes it to `renderReportPdf()`.
3. The generator lays out an **A4 portrait** page modelled on the paper form:
   - **Header:** logo, company name and tagline, the Report No. / Date / Day box, the purple
     *DAILY LABORATORY OPERATIONS REPORT* banner, and a Department / Prepared By / Notes strip.
   - **Sections 1–13:** each numbered section in a framed box with its title label. Checkboxes show ticks,
     Yes/No answers show ticked boxes, and 3 & 4 and 7 & 8 sit side by side as on the paper.
   - **Sample Details table:** when it doesn't fit on one page, it continues on the next page with the column
     headers repeated. Long text wraps inside cells.
   - **Long text** (work status, pending work…) flows onto further pages.
   - **Sign-off:** Prepared By and Verified By with name, the drawn signature image (if any) and date & time.
     Unsigned blocks show a blank line, or *Pending verification* / *Draft — not yet submitted*.
   - **Every page:** a footer with organisation, generation time, report number, status and *Page N of M*.
     Pages 2+ also have a small running header. Drafts get a *DRAFT* watermark and deleted reports a
     *DELETED* watermark.
4. The PDF is returned to the browser and a `PDF_GENERATED` entry is written to the audit trail.

**Print Report** fetches the same PDF, loads it in a hidden frame and opens the browser's print dialog. The
printout is identical to the downloaded PDF.

**Fonts:** IBM Plex Sans (in `assets/fonts/`) is embedded so symbols like µ, ±, ≥, °, → and ₹ print correctly.
If the font files are missing, the generator falls back to Helvetica.

---

## 5. How Excel export works

`src/lib/excel/export-reports.ts` builds an `.xlsx` workbook with **ExcelJS**.

1. In **Report History**, click **EXPORT TO EXCEL**. Choose:
   - **Reports matching filters:** the current search filters plus a date range picked in the dialog (All
     Records, Today, Yesterday, This Week, This Month, Selected Date, Custom Range).
   - **Selected reports:** only the rows you ticked.
2. The browser sends `POST /api/reports/export`. The server uses **exactly the same filter logic** as Report
   History, loads every matching report with all its rows, and builds the workbook.
3. The file downloads with a descriptive name, e.g.
   `GVBL-NGS-Daily-Reports_2026-09-01_to_2026-09-30_exported-2026-09-17.xlsx`, and an `EXPORT` audit entry
   is recorded.

**Sheets:**

| Sheet | One row per… | Columns |
|---|---|---|
| **Daily Reports** | report | Every single-value field of the form: header, sample summary, sample quality, activities, invoice, inventory, sequencing, work status, issues, pending work, comments, prepared/verified name & time, created/updated by & at, plus sample/kit/consumable row counts |
| **Sample Details** | sample | Report No., Report Date, Sample ID, Project/Institute, Sample Type, Current Status, Received From, Sent To, Coordinated By, Remarks |
| **Kits-Reagents Used** | kit | Report No., Report Date, Kit/Reagent Name, Lot No., Quantity Used |
| **Consumables-Reagents Received** | item | Report No., Report Date, Item/Reagent Name, Batch/Lot/Catalogue No., Invoice Details, Supplier |
| **Export Info** | — | When it was exported, the date range, the filters used and row counts |

Every data sheet has a purple header row, frozen header, auto-filter buttons, real Excel dates (so sorting and
filtering by date works) and landscape, fit-to-width print settings. *Report No.* appears on every sheet so
rows can be matched up.

If nothing matches, the export is refused with a message instead of producing an empty file.

---

## 6. Who did what — names instead of accounts

There are no users or passwords, so the system records **names as typed**:

| Action | Name recorded |
|---|---|
| Create / edit a report | The report's **Prepared By** field |
| Verify | **Verified By** name entered in the Verify dialog (plus optional signature) |
| Delete | Name entered in the Delete dialog, plus a mandatory reason |
| Restore | Name entered in the Restore dialog |
| PDF / Excel | "Laboratory user" (the IP address is also recorded) |

The **Audit Trail** page lists all of this and can be filtered by report number, name or action.

If you later want real sign-in (for example, only certain people may verify), it can be added in front of the
app. The simplest option is your web server or VPN (e.g. HTTP basic auth or single sign-on on Nginx /
Cloudflare Access). The alternative is adding a login system to the app itself.

---

## 7. Deploying to production

### Option A — one lab server with Docker (recommended)

On a Linux machine inside the lab network, with Docker installed:

```bash
# 1. Copy the project to the server and create the settings file
cp .env.example .env
#    Set a strong database password in BOTH docker-compose.yml and DATABASE_URL.
#    Set SEED_DEMO_DATA="false" if you don't want demo data.

# 2. Start PostgreSQL
docker compose up -d db

# 3. Build and run the app (migrations are applied automatically on start)
docker build -t gvbl-lab-ops .
docker run -d --name gvbl-lab-ops --restart unless-stopped \
  --env-file .env \
  -e DATABASE_URL="postgresql://gvbl:YOUR_PASSWORD@host.docker.internal:5432/gvbl_lab_ops?schema=public" \
  --add-host=host.docker.internal:host-gateway \
  -p 3000:3000 gvbl-lab-ops

# 4. (Optional) demo data
docker exec gvbl-lab-ops npm run db:seed
```

Staff then open `http://<server-IP>:3000`. Check `http://<server-IP>:3000/api/health`; it should report
`"database": "up"`.

**Updating to a new version:** copy the new code, rebuild the image, stop and remove the old container, run
the new one. Pending migrations apply automatically and existing data is kept.

### Option B — without Docker (Node + PostgreSQL installed directly)

```bash
npm ci
npm run db:deploy
npm run build
npm run start            # listens on port 3000
```

Keep it running with a process manager such as **pm2**
(`npm i -g pm2 && pm2 start npm --name gvbl -- start && pm2 save && pm2 startup`).

### Recommended in either case

- Put **Nginx** (or similar) in front with HTTPS, and allow only the lab network or VPN to reach it.
- Schedule daily `pg_dump` backups and test restoring one.
- Keep the server's clock and time zone correct.

---

## 8. Maintenance tasks

| Task | How |
|---|---|
| Remove demo data | `npm run db:remove-demo` (type `remove` to confirm; add `-- --yes` to skip the prompt). Only rows with `is_demo = true` are deleted; the report number counter continues after your highest real report. |
| Restore a deleted report | Report History → tick *Include deleted reports* → open the report → **Restore Report** |
| Change the report number prefix | Set `REPORT_NUMBER_PREFIX` in `.env`. It applies to new reports only. |
| Change the sample types, statuses, activities or quality options | Edit `src/lib/constants.ts`. Existing reports keep their stored values. |
| See what happened to a report | Audit Trail → search the report number |

---

## 9. Project structure — every file

### Root configuration

| File | Purpose |
|---|---|
| `package.json` / `package-lock.json` | Dependencies and npm scripts |
| `.env.example` | Template for `.env` (database URL, time zone, report prefix, demo flag) |
| `.gitignore` | Files kept out of version control |
| `tsconfig.json` | TypeScript settings; `@/…` imports point to `src/` |
| `next.config.mjs` | Next.js settings: keeps PDFKit/ExcelJS on the server, bundles fonts and logo for the PDF route, security headers |
| `next-env.d.ts` | Next.js TypeScript type references |
| `tailwind.config.ts` | Colour palette taken from the GVBL logo (violet), blue accent, IBM Plex Sans font |
| `postcss.config.mjs` | Tailwind/Autoprefixer pipeline |
| `docker-compose.yml` | Local/production PostgreSQL 16 container |
| `Dockerfile` | Production image; runs migrations then starts the app |

### Database — `prisma/`

| File | Purpose |
|---|---|
| `schema.prisma` | Table definitions: reports, samples, kits, consumables, counters, audit logs |
| `migrations/20260917000000_init/migration.sql` | SQL that creates all tables, indexes and foreign keys |
| `migrations/migration_lock.toml` | Marks the migrations as PostgreSQL |
| `seed.ts` | Inserts 25 labelled demo reports, including one transcribed from the scanned paper form |

### Scripts — `scripts/`

| File | Purpose |
|---|---|
| `remove-demo-data.ts` | Deletes all demo reports and their audit entries, and fixes the number counter |

### Assets

| File | Purpose |
|---|---|
| `public/logo.png` | GVBL logo (square crop) used in the app and PDF |
| `public/favicon.png`, `public/apple-touch-icon.png` | Browser tab / home-screen icons |
| `assets/fonts/IBMPlexSans-*.ttf` | Fonts embedded in PDFs (SIL Open Font License) |
| `assets/fonts/README.md` | Font licence note and Helvetica fallback |

### Pages — `src/app/`

| File | Purpose |
|---|---|
| `layout.tsx` | Root HTML, page titles, favicon, notification system |
| `globals.css` | Tailwind base, shared form/table/section styles, print rules |
| `page.tsx` | Redirects `/` to the dashboard |
| `not-found.tsx` | "Page or report not found" screen |
| `(app)/layout.tsx` | Wraps all pages in the sidebar layout |
| `(app)/loading.tsx` | Skeleton shown while a page loads |
| `(app)/error.tsx` | Friendly error screen (e.g. database unreachable) with *Try again* |
| `(app)/dashboard/page.tsx` | Dashboard: stat cards, charts, recent reports, drafts |
| `(app)/reports/page.tsx` | Report History (reads filters from the URL) |
| `(app)/reports/new/page.tsx` | New Daily Report form |
| `(app)/reports/[id]/page.tsx` | View a report + Edit / PDF / Print / Verify / Delete / Restore |
| `(app)/reports/[id]/edit/page.tsx` | Edit an existing report |
| `(app)/audit/page.tsx` | Audit Trail with filters and paging |

### API routes — `src/app/api/`

| Route | Methods | Purpose |
|---|---|---|
| `reports/route.ts` | GET, POST | List/search reports; create a report |
| `reports/[id]/route.ts` | GET, PUT, DELETE | Read, update, soft-delete one report |
| `reports/[id]/verify/route.ts` | POST | Verify a completed report |
| `reports/[id]/restore/route.ts` | POST | Restore a deleted report |
| `reports/[id]/pdf/route.ts` | GET | Generate the PDF (inline or download) |
| `reports/export/route.ts` | POST | Build and download the Excel workbook |
| `dashboard/stats/route.ts` | GET | Dashboard figures as JSON |
| `health/route.ts` | GET | Health check incl. database connectivity |

### Components — `src/components/`

| File | Purpose |
|---|---|
| `layout/AppShell.tsx` | Sidebar navigation (desktop) and slide-out menu (mobile) |
| `ui/Button.tsx` | Button and link-button styles, loading spinner |
| `ui/Field.tsx` | Field wrapper, Input, Textarea, Select, error messages |
| `ui/Choice.tsx` | Tick-box and Yes/No segmented control |
| `ui/Badge.tsx` | Status badges (Draft/Completed/Verified) and small labels |
| `ui/Modal.tsx` | Dialog and confirmation dialog |
| `ui/SignaturePad.tsx` | Draw-to-sign pad (mouse/touch/stylus) → PNG |
| `ui/Toast.tsx` | Success/error notifications ("Report saved successfully.") |
| `ui/PageHeader.tsx` | Page titles and empty-state panels |
| `ui/Pagination.tsx` | Previous/Next paging bar |
| `report-form/ReportForm.tsx` | Form container: state, validation, SAVE REPORT / Save as Draft, unsaved-changes guard |
| `report-form/context.tsx` | Shares form state and row helpers with the section components |
| `report-form/SectionCard.tsx` | Numbered purple section frame |
| `report-form/HeaderSection.tsx` | Report No., Date, Day, Department, Prepared By, Notes |
| `report-form/SampleSummarySection.tsx` | Section 1 |
| `report-form/SampleDetailsSection.tsx` | Section 2 (dynamic sample rows with coordination fields) |
| `report-form/SampleQualitySection.tsx` | Section 3 |
| `report-form/ActivitiesSection.tsx` | Section 4 |
| `report-form/SimpleTable.tsx` | Reusable editable table for sections 5 and 6 |
| `report-form/KitsSection.tsx` | Section 5 |
| `report-form/ConsumablesSection.tsx` | Section 6 |
| `report-form/InvoiceSection.tsx` | Section 7 |
| `report-form/InventorySection.tsx` | Section 8 |
| `report-form/SequencingSection.tsx` | Section 9 |
| `report-form/TextSections.tsx` | Sections 10, 11, 12 |
| `report-form/SignOffSection.tsx` | Section 13: comments, Prepared By signature/time, Verified By status |
| `report-form/RowControls.tsx` | Move up / move down / remove buttons for table rows |
| `reports/ReportView.tsx` | Read-only report laid out like the paper form |
| `reports/ReportHistory.tsx` | History table, search/filters, row selection |
| `reports/DateRangeFields.tsx` | Date filter selector with From ≤ To validation |
| `reports/ExportDialog.tsx` | Excel export options dialog |
| `reports/PdfButtons.tsx` | Generate PDF, Download PDF, Print Report |
| `reports/ReportActions.tsx` | Verify, Delete and Restore dialogs |
| `dashboard/StatCard.tsx` | Dashboard number tiles |
| `dashboard/Charts.tsx` | 14-day samples, 12-month volume and activity charts (Recharts) |

### Server and shared logic — `src/lib/`

| File | Purpose |
|---|---|
| `prisma.ts` | Single shared database client |
| `report-service.ts` | Create, update, verify, delete, restore, list, search and export queries |
| `report-number.ts` | Formats and allocates `GVBL-NGS-YYYY-NNNN` numbers |
| `report-filters.ts` | Converts URL query ↔ filter object (shared by history and export) |
| `report-mapper.ts` | Converts between form state, API payload and stored report |
| `validation.ts` | All input rules (Zod), shared by browser and server |
| `audit.ts` | Writes audit entries and computes field-level change summaries |
| `dashboard.ts` | Dashboard statistics queries |
| `pdf/report-pdf.ts` | PDF generator |
| `excel/export-reports.ts` | Excel workbook generator |
| `constants.ts` | Organisation text, sample types/statuses, activities, platforms, labels |
| `dates.ts` | Date handling in the lab time zone, dd/mm/yyyy formatting, date-range resolution |
| `api.ts` | Consistent JSON error responses, request helpers |
| `api-error.ts` | Error type carrying an HTTP status |
| `client-api.ts` | Browser fetch/download helpers with readable errors |
| `page-helpers.ts` | Loads a report for a page or shows 404 |
| `ids.ts` | Random IDs that also work on plain-HTTP LAN addresses |
| `utils.ts` | Class-name joining and display helpers |

### Types — `src/types/`

| File | Purpose |
|---|---|
| `report.ts` | TypeScript shapes for form state, stored reports and history rows |
