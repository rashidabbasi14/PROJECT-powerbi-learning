# PROJECT-powerbi-learning

A free local Power BI learning environment for **Northstar Auto Care**, a fictional auto repair shop. All employee and transaction records are synthetic. TriNet-style and Tekmetric-style mean simplified learning schemas, not official vendor API compatibility.

## Open the demo

1. Open `PROJECT-powerbi-learning.code-workspace` in VS Code.
2. Run `./Start-Demo.ps1` in a PowerShell terminal in this folder. The server runs hidden and binds only to 127.0.0.1:8765.
3. Open http://127.0.0.1:8765 for the browser dashboard.
4. Open `powerbi/Northstar.pbip` in Power BI Desktop. Cancel optional sign-in for local use.
5. Click **Home > Refresh**. For http://127.0.0.1:8765 choose Anonymous when Power BI requests API credentials. These fictional read-only endpoints need no login.
6. Save the project after the first refresh. Imported data is stored locally in the ignored `.pbi` folder.

## Report views and filters

- **Dashboard:** attendance rate, worked hours, absence, revenue, gross profit and repair orders together, with attendance and sales charts.
- **Attendance:** employee attendance, scheduled/worked hours, overtime, lateness, leave and absence.
- **Performance:** revenue, gross profit, repair count, average invoice, billed hours and service mix.
- **All time:** every available date; no specific-date control appears.
- **Weekly:** defaults to the current Monday–Sunday week. Choose a week from the dropdown, use Previous/Next, or return with This week.
- **Monthly:** defaults to the current calendar month. Choose a month from the dropdown, use Previous/Next, or return with This month.
- **Custom dates:** only From and To calendar controls appear; both dates are inclusive. Invalid ranges show a clear message.
- Department and employee filters apply to both attendance and attributed technician sales. The browser preserves filters when changing pages and offers Reset filters plus CSV export. Each Power BI page keeps its own date selection, so its controls and displayed figures stay consistent.
- The Power BI report includes a project-owned **Northstar Date Filter** custom visual. This controls the actual Power BI model; it is not an embedded copy of the browser dashboard. It has no web-access privileges and sends no data to external services. Source and build files are in NorthstarDateFilter/. A packaged copy is bundled inside the report, so no paid visual subscription is required.

## Refresh and live behavior

The browser polls the local API every 15 seconds and displays its update time. The fictional dataset is deterministic and extends to the current date in Asia/Karachi. Polling does not imply a new repair or attendance event every 15 seconds. Power BI uses **Import**, with manual Refresh; it is not a streaming Power BI report. True unattended Power BI refresh/DirectQuery hosting is a later cloud/infrastructure phase. The server must run while refreshing. No cloud workspace or subscription was created.

## API endpoints

Base: `http://127.0.0.1:8765`

| Route | Purpose |
| --- | --- |
| `/health` | Health and simulated-data flag |
| `/api/trinet/v1/employees` | 12 employees and departments |
| `/api/trinet/v1/attendance` | One scheduled weekday shift per employee per date |
| `/api/trinet/v1/attendance/weekly?weekStart=2026-11-02` | Employee weekly attendance summaries |
| `/api/tekmetric/v1/shops` | Shop information |
| `/api/tekmetric/v1/repair-orders` | Technician and service transactions |
| `/api/powerbi/dates` | Date dimension, Monday weeks and current-period flags |
| `/api/dashboard` | Combined data used by the browser |

Collection responses have `data` and `pagination` with `page`, `pageSize`, `total`, `hasMore`. Query examples: `?page=2&pageSize=100`, `?employeeId=E001`, `?from=2026-11-01&to=2026-11-06`, `?weekStart=2026-11-02`, `?month=2026-10`. Filters apply to fields present on the endpoint. Invalid pagination returns 400; unknown routes return 404. Logs are in `logs/requests.ndjson` and contain route/time/status, not employee payloads.

## Definitions

- Attendance rate = present shifts / scheduled shifts; approved leave remains in the denominator and is separately counted.
- Worked hours exclude leave and absences. Demo overtime = max(worked hours minus 8, 0), per day. This is a learning rule, not an implementation of payroll policy.
- USD revenue = labor sales + parts sales. Gross profit = revenue minus parts cost minus modeled direct labor at $32/hour. This excludes overhead and tax.
- Dates, weeks, and freshness use Asia/Karachi. No data is generated for future shifts. Monday–Friday schedule; no weekend shifts.

## Learn and extend

Start with Power Query in `powerbi/queries`, then inspect the four core tables and DAX measures and DAX measures in `powerbi/Northstar.SemanticModel/model.bim`. Practice changing a chart, adding a measure, and using employee/week filters.

`npm test` runs data reconciliation, reference integrity, weekly boundary and HTTP pagination checks while the API is running. `npm run build:powerbi` regenerates the original report definition and overwrites report edits: close Power BI and back up edits before using it.

Real vendor connections later require approved vendor credentials, vendor-specific pagination and mappings, secrets stored outside Git, and a secure backend adapter. Never put real employee data or credentials into these demo files. Cloud publishing is deferred by request; local URLs will need a gateway or hosted API before cloud refresh can reach them.


## Rebuilding the Power BI date control

The report already contains its packaged visual. To modify the visual, edit NorthstarDateFilter/src/visual.ts and style/visual.less, install its locked dependencies, and package with the project-local Microsoft pbiviz tool under powerbi-visual/node_modules/.bin/. Extract the resulting .pbiviz into the matching report CustomVisuals directory, then run scripts/integrate-date-visual.mjs with Power BI closed. Do not edit the report sources while an older unsaved instance is open. The local package uses a reserved example.invalid author address as placeholder build metadata.
