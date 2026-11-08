import fs from 'node:fs';const p='README.md';let s=fs.readFileSync(p,'utf8').replace(/^\uFEFF/,'');const start=s.indexOf('## Report views'),end=s.indexOf('## Refresh and live behavior');s=s.slice(0,start)+`## Report views and filters

- **Dashboard:** attendance rate, worked hours, absence, revenue, gross profit and repair orders together, with attendance and sales charts.
- **Attendance:** employee attendance, scheduled/worked hours, overtime, lateness, leave and absence.
- **Performance:** revenue, gross profit, repair count, average invoice, billed hours and service mix.
- **All time:** every available date; no specific-date control appears.
- **Weekly:** defaults to the current Monday–Sunday week. Choose a week from the dropdown, use Previous/Next, or return with This week.
- **Monthly:** defaults to the current calendar month. Choose a month from the dropdown, use Previous/Next, or return with This month.
- **Custom dates:** only From and To calendar controls appear; both dates are inclusive. Invalid ranges show a clear message.
- Department and employee filters apply to both attendance and attributed technician sales. The browser preserves filters when changing pages and offers Reset filters plus CSV export.
- The Power BI report includes a project-owned **Northstar Date Filter** custom visual. This controls the actual Power BI model; it is not an embedded copy of the browser dashboard. It has no web-access privileges and sends no data to external services. Source and build files are in NorthstarDateFilter/. A packaged copy is bundled inside the report, so no paid visual subscription is required.

`+s.slice(end);s=s.replace('four-table star schema','four core tables and DAX measures');s+='\n## Rebuilding the Power BI date control\n\nThe report already contains its packaged visual. To modify the visual, edit NorthstarDateFilter/src/visual.ts and style/visual.less, install its locked dependencies, and package with the project-local Microsoft pbiviz tool under powerbi-visual/node_modules/.bin/. Extract the resulting .pbiviz into the matching report CustomVisuals directory, then run scripts/integrate-date-visual.mjs with Power BI closed. Do not edit the report sources while an older unsaved instance is open. The local package uses a reserved example.invalid author address as placeholder build metadata.\n';fs.writeFileSync(p,s);
