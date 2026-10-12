# Make a Calendar — ChronoStudio Pro

ChronoStudio Pro is an original, offline-first userscript that adds a calendar workbench to [Make a Calendar](https://make-a-calendar.com/). Its floating launcher stays closed until clicked. The panel runs beside the site and does not replace the site's editor or alter its drafts.

**Status:** 0.1.0 preview. The core calendar, date, scheduling, export and local-planner modules are implemented and covered by automated tests. The public release should be treated as an initial tested preview, not as a promise that every optional feature from the original project brief is included.

## Features

- Calendar Studio with Sunday or Monday starts, natural four-to-six-row grids, adjacent dates, ISO week labels and holiday markers.
- Date Inspector with ISO week-year, day-of-year, quarter, leap-year and two-date comparison.
- Business-day range counts and add-day calculations with explicit endpoints, weekends, custom closures and optional US federal observed dates.
- Sunday-nearest-February-1 fiscal model with 4-4-5, 4-5-4, 5-4-4 and 53-week handling.
- Weekly, biweekly, semi-monthly and monthly payday previews; 2-2-3, 4-on/3-off, 5-on/2-off and custom shift cycles.
- Bounded day, week and month recurrence; a five-field UTC cron visualizer.
- Offline civil date, ISO 8601, Unix seconds/milliseconds/microseconds/nanoseconds, Excel 1900-system, Windows FILETIME and Gregorian ordinal conversions.
- Local notes with search, categories, priorities, completion state, editing, JSON backup/import and CSV export.
- Calendar exports as JSON, CSV, ICS, SVG and standalone HTML; native print-to-PDF through the browser print dialog.
- Searchable resource finder with page-aware suggestions, favorites and recently opened tools.

All calculations run in the script. There is no analytics, remote API, advertising, affiliate redirect or telemetry. Notes and preferences remain in the current browser profile.

## Install

After the script is published, install it from [Greasy Fork](https://greasyfork.org/en/scripts/). Use a current userscript manager such as Tampermonkey or Violentmonkey. The source is intentionally self-contained and readable; it uses no `@require` libraries or extra grants.

For development, build the inspectable file with `npm run build`, then install `dist/chronostudio.user.js` through your local userscript manager.

## Use

Open [Make a Calendar](https://make-a-calendar.com/), select the floating **ChronoStudio** launcher, then choose a tool in the left navigation. `Ctrl/Cmd + Shift + K` opens or closes the panel, and `Escape` closes it. The keyboard shortcut can be disabled in Settings.

The selected civil date is evaluated independently from timestamps. Timestamp conversion needs an explicit timezone for ISO date-times. Business-day and payroll previews show their assumptions; confirm organization-specific rules before using the results for a contract or a pay decision.

## Verified Make a Calendar resources

- [Monthly calendars](https://make-a-calendar.com/monthly-calendars) and [2027 yearly calendar](https://make-a-calendar.com/yearly-calendars/2027) for month and year layouts.
- [Business-days calculator](https://make-a-calendar.com/business-days-calculator) for a second workday calculation.
- [4-4-5 calendar](https://make-a-calendar.com/445-calendar) and [fiscal calendar](https://make-a-calendar.com/fiscal-calendar) for retail-period context.
- [Pay-period calendar](https://make-a-calendar.com/pay-period-calendar) and [shift calendar](https://make-a-calendar.com/shift-calendar) for schedule comparisons.
- [Recurring dates](https://make-a-calendar.com/recurring-dates), [cron calculator](https://make-a-calendar.com/cron-calculator), and [cron visual calendar](https://make-a-calendar.com/cron-calendar) for related tools.
- [Date converters](https://make-a-calendar.com/converters), [ICS generator](https://make-a-calendar.com/ical-generator), [blank templates](https://make-a-calendar.com/pages/blank-calendar), and [monthly calendar pages](https://make-a-calendar.com/monthly-calendars) for conversion and print workflows.

These are user-facing references. Their presence is not a claim about search ranking or indexing.

## Guides

The technical guides cover [calendar grids](docs/calendar-studio.md), [business-day mathematics](docs/business-days.md), [fiscal calendars](docs/fiscal-calendars.md), [payroll planning](docs/payroll.md), [shift cycles](docs/shifts.md), [recurrence](docs/recurrence.md), [cron](docs/cron.md), [date conversion](docs/converters.md), [print rendering](docs/printing.md), [ICS interoperability](docs/ics.md), [year planning](docs/year-planning.md), [local-first privacy](docs/local-first.md), and the [site research matrix](docs/research-matrix.md).

## Development and tests

Requires Node.js 20 or later. There are no runtime package dependencies.

```sh
npm run verify
```

The test suite uses Node's built-in test runner and covers Gregorian and ISO boundaries, month-grid invariants, holiday observance, business-day range rules, 52/53-week fiscal years, recurrence clamping, crontab parsing, timestamp precision and export escaping. CI repeats the same build, syntax and test checks.

## Known limits

- The fiscal tool is a documented Sunday-nearest-February-1 model, not an official NRF calendar.
- Holiday handling is a planning aid for US federal observed dates; local, company, banking and contract calendars vary.
- Cron supports only five numeric fields and searches up to 90 days for the next runs. It does not emulate Quartz, systemd, cloud-provider extensions, daylight-saving rules or job success.
- ICS output is a finite list of all-day events. It is not a subscription feed or full RFC 5545 recurrence editor.
- Payroll output shows dates only. It does not calculate wages, tax, deductions, benefits or legal entitlements.
- PDF output is the browser's native print-to-PDF workflow. ChronoStudio does not claim to generate a standalone PDF binary.
- The site-specific source review page for the reference Beta Calendars userscript returned HTTP 503 during this run. Its public listing and described feature set were reviewed; no source was copied.

## License and support

MIT. See [LICENSE](LICENSE). Report issues in [GitHub Issues](https://github.com/makeacalendar/make-a-calendar-chronostudio/issues).
