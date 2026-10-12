// ==UserScript==
// @name         Make a Calendar — ChronoStudio Pro
// @namespace    https://make-a-calendar.com/
// @version      0.1.0
// @description  Local calendar workbench for date inspection, workdays, schedules, converters, notes and exports on Make a Calendar.
// @author       Ethan
// @license      MIT
// @homepageURL  https://make-a-calendar.com/
// @supportURL   https://github.com/makeacalendar/make-a-calendar-chronostudio/issues
// @match        https://make-a-calendar.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

/*
 * ChronoStudio Pro is an original, offline-first calendar workbench. All
 * calculations and exports run in this file. It does not make network calls.
 */
(function chronostudio(global) {
  'use strict';

  const DAY_MS = 86400000;
  const STORAGE_KEY = 'chronostudio-pro:v1';
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const RESOURCE_LIST = [
    { title: 'Monthly calendars', url: 'https://make-a-calendar.com/monthly-calendars', topic: 'Calendars & Printables', description: 'Browse monthly layouts, holidays and print options.', tags: 'month print holidays' },
    { title: '2027 yearly calendar', url: 'https://make-a-calendar.com/yearly-calendars/2027', topic: 'Calendars & Printables', description: 'See a full year with ISO week numbers.', tags: 'year annual iso week' },
    { title: 'Blank calendar templates', url: 'https://make-a-calendar.com/pages/blank-calendar', topic: 'Calendars & Printables', description: 'Open undated printable calendar grids.', tags: 'blank template paper' },
    { title: 'Calendar generator', url: 'https://make-a-calendar.com/calendar-generator', topic: 'Calendars & Printables', description: 'Build a clean twelve-month civil-year grid.', tags: 'year grid generator' },
    { title: 'Business days calculator', url: 'https://make-a-calendar.com/business-days-calculator', topic: 'Business & Workdays', description: 'Compare a range with the site workday calculator.', tags: 'business weekdays deadline holidays' },
    { title: 'Pay period calendar', url: 'https://make-a-calendar.com/pay-period-calendar', topic: 'Payroll & Shift Planning', description: 'Explore pay-frequency calendars.', tags: 'payroll payday weekly biweekly' },
    { title: 'Rotating shift calendar', url: 'https://make-a-calendar.com/shift-calendar', topic: 'Payroll & Shift Planning', description: 'Compare a repeating shift plan with a visual calendar.', tags: 'shift rotation work' },
    { title: '4-4-5 retail calendar', url: 'https://make-a-calendar.com/445-calendar', topic: 'Fiscal Calendars', description: 'Review retail weeks and fiscal periods.', tags: 'fiscal retail 445' },
    { title: 'Fiscal calendar', url: 'https://make-a-calendar.com/fiscal-calendar', topic: 'Fiscal Calendars', description: 'Open fiscal-year planning tools.', tags: 'fiscal year period' },
    { title: 'Recurring dates', url: 'https://make-a-calendar.com/recurring-dates', topic: 'Recurrence & Cron', description: 'Generate date-based repeats from an anchor.', tags: 'recurrence repeat intervals' },
    { title: 'Cron calculator', url: 'https://make-a-calendar.com/cron-calculator', topic: 'Recurrence & Cron', description: 'Translate five-field cron expressions.', tags: 'cron schedule devops' },
    { title: 'Cron visual calendar', url: 'https://make-a-calendar.com/cron-calendar', topic: 'Recurrence & Cron', description: 'View a cron schedule on a UTC month grid.', tags: 'cron month utc' },
    { title: 'Date converters', url: 'https://make-a-calendar.com/converters', topic: 'Technical Converters', description: 'Compare common timestamp and spreadsheet formats.', tags: 'unix excel filetime iso date' },
    { title: 'Excel date converter', url: 'https://make-a-calendar.com/excel-date-converter', topic: 'Technical Converters', description: 'Inspect Excel serial date behavior.', tags: 'excel serial spreadsheet 1900' },
    { title: 'ICS calendar generator', url: 'https://make-a-calendar.com/ical-generator', topic: 'Recurrence & Cron', description: 'Create a downloadable all-day calendar file.', tags: 'ics ical export events' },
    { title: 'Date tools', url: 'https://make-a-calendar.com/date-tools', topic: 'Date Calculations', description: 'Find more date, week and deadline calculators.', tags: 'date tools days week' },
    { title: 'Time tools', url: 'https://make-a-calendar.com/time-tools', topic: 'Time & World Clocks', description: 'Open timers, clocks and duration tools.', tags: 'time clock duration' },
    { title: 'Moon phases', url: 'https://make-a-calendar.com/moon-phases', topic: 'Moon & Astronomy', description: 'Browse lunar dates and phase information.', tags: 'moon lunar astronomy' }
  ];

  function utcDate(year, month, day) {
    const value = new Date(0);
    value.setUTCHours(0, 0, 0, 0);
    value.setUTCFullYear(year, month - 1, day);
    return value;
  }

  function parseCivilDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || '').trim());
    if (!match) throw new Error('Enter a date in YYYY-MM-DD format.');
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (year < 1 || year > 9999 || month < 1 || month > 12) throw new Error('That civil date is outside the supported range.');
    const date = utcDate(year, month, day);
    if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) throw new Error('That day does not exist in the selected month.');
    return date;
  }

  function formatDate(date) {
    const y = String(date.getUTCFullYear()).padStart(4, '0');
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  function epochDay(date) { return Math.floor(date.getTime() / DAY_MS); }
  function fromEpochDay(value) { return new Date(Number(value) * DAY_MS); }
  function addDays(date, amount) { return fromEpochDay(epochDay(date) + Number(amount)); }
  function daysInMonth(year, month) { return utcDate(year, month + 1, 0).getUTCDate(); }
  function weekday(date) { return date.getUTCDay(); }
  function leapYear(year) { return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0); }

  function addMonths(date, amount) {
    const total = date.getUTCFullYear() * 12 + date.getUTCMonth() + Number(amount);
    const year = Math.floor(total / 12);
    const month = ((total % 12) + 12) % 12 + 1;
    return utcDate(year, month, Math.min(date.getUTCDate(), daysInMonth(year, month)));
  }

  function dayOfYear(date) { return epochDay(date) - epochDay(utcDate(date.getUTCFullYear(), 1, 1)) + 1; }

  function isoWeek(date) {
    const mondayIndex = (weekday(date) + 6) % 7;
    const thursday = addDays(date, 3 - mondayIndex);
    const isoYear = thursday.getUTCFullYear();
    const jan4 = utcDate(isoYear, 1, 4);
    const firstMonday = addDays(jan4, -((weekday(jan4) + 6) % 7));
    return { year: isoYear, week: Math.floor((epochDay(date) - epochDay(firstMonday)) / 7) + 1 };
  }

  function monthGrid(year, month, weekStart) {
    if (!Number.isInteger(year) || year < 1 || year > 9999 || !Number.isInteger(month) || month < 1 || month > 12 || ![0, 1].includes(weekStart)) throw new Error('Month grid needs a supported year, month and Sunday/Monday week start.');
    const first = utcDate(year, month, 1);
    const offset = (weekday(first) - weekStart + 7) % 7;
    const rows = Math.ceil((offset + daysInMonth(year, month)) / 7);
    const start = addDays(first, -offset);
    return Array.from({ length: rows * 7 }, function (_, index) { return addDays(start, index); });
  }

  function nthWeekday(year, month, weekdayNumber, n) {
    const first = utcDate(year, month, 1);
    return 1 + ((weekdayNumber - weekday(first) + 7) % 7) + (n - 1) * 7;
  }

  function lastWeekday(year, month, weekdayNumber) {
    const last = daysInMonth(year, month);
    return last - ((weekday(utcDate(year, month, last)) - weekdayNumber + 7) % 7);
  }

  function observedFixed(year, month, day) {
    const actual = utcDate(year, month, day);
    const dow = weekday(actual);
    if (dow === 6) return addDays(actual, -1);
    if (dow === 0) return addDays(actual, 1);
    return actual;
  }

  function usFederalHolidays(year) {
    const entries = [];
    function add(name, date) { entries.push({ name: name, date: formatDate(date) }); }
    add("New Year's Day", observedFixed(year, 1, 1));
    add('Martin Luther King Jr. Day', utcDate(year, 1, nthWeekday(year, 1, 1, 3)));
    add("Washington's Birthday", utcDate(year, 2, nthWeekday(year, 2, 1, 3)));
    add('Memorial Day', utcDate(year, 5, lastWeekday(year, 5, 1)));
    if (year >= 2021) add('Juneteenth National Independence Day', observedFixed(year, 6, 19));
    add('Independence Day', observedFixed(year, 7, 4));
    add('Labor Day', utcDate(year, 9, nthWeekday(year, 9, 1, 1)));
    add('Columbus Day', utcDate(year, 10, nthWeekday(year, 10, 1, 2)));
    add('Veterans Day', observedFixed(year, 11, 11));
    add('Thanksgiving Day', utcDate(year, 11, nthWeekday(year, 11, 4, 4)));
    add('Christmas Day', observedFixed(year, 12, 25));
    return entries.sort(function (a, b) { return a.date.localeCompare(b.date); });
  }

  function holidaySetForRange(start, end) {
    const set = new Set();
    const first = epochDay(start) <= epochDay(end) ? start : end;
    const last = epochDay(start) <= epochDay(end) ? end : start;
    for (let year = first.getUTCFullYear() - 1; year <= last.getUTCFullYear() + 1; year += 1) {
      usFederalHolidays(year).forEach(function (holiday) { set.add(holiday.date); });
    }
    return set;
  }

  function isBusinessDay(date, options) {
    const opts = options || {};
    const weekend = opts.weekendDays || [0, 6];
    const key = formatDate(date);
    return !weekend.includes(weekday(date)) && !(opts.holidays && opts.holidays.has(key)) && !(opts.customDates && opts.customDates.has(key));
  }

  function countBusinessDays(start, end, options) {
    if (epochDay(start) > epochDay(end)) throw new Error('Start date must be on or before end date.');
    const opts = options || {};
    const first = opts.includeStart === false ? addDays(start, 1) : start;
    const last = opts.includeEnd === false ? addDays(end, -1) : end;
    if (epochDay(first) > epochDay(last)) return 0;
    if (epochDay(last) - epochDay(first) > 36600) throw new Error('Choose a range of ten years or less.');
    let count = 0;
    for (let current = first; epochDay(current) <= epochDay(last); current = addDays(current, 1)) {
      if (isBusinessDay(current, opts)) count += 1;
    }
    return count;
  }

  function addBusinessDays(start, amount, options) {
    let date = start;
    const direction = Number(amount) < 0 ? -1 : 1;
    let remaining = Math.abs(Math.trunc(Number(amount)));
    let scanned = 0;
    while (remaining > 0) {
      date = addDays(date, direction);
      scanned += 1;
      if (scanned > 36600) throw new Error('The requested business-day offset is too large.');
      if (isBusinessDay(date, options)) remaining -= 1;
    }
    return date;
  }

  function nearestSundayToFeb1(year) {
    const feb1 = utcDate(year, 2, 1);
    const dow = weekday(feb1);
    if (dow === 0) return feb1;
    if (dow <= 3) return addDays(feb1, -dow);
    return addDays(feb1, 7 - dow);
  }

  const FISCAL_PATTERNS = { '4-4-5': [4, 4, 5, 4, 4, 5, 4, 4, 5, 4, 4, 5], '4-5-4': [4, 5, 4, 4, 5, 4, 4, 5, 4, 4, 5, 4], '5-4-4': [5, 4, 4, 5, 4, 4, 5, 4, 4, 5, 4, 4] };

  function fiscalCalendar(year, patternName) {
    if (!Number.isInteger(year) || year < 1 || year > 9998) throw new Error('Fiscal year must be an integer from 1 to 9998.');
    if (patternName && !FISCAL_PATTERNS[patternName]) throw new Error('Choose 4-4-5, 4-5-4 or 5-4-4.');
    const pattern = FISCAL_PATTERNS[patternName] || FISCAL_PATTERNS['4-4-5'];
    const start = nearestSundayToFeb1(year);
    const end = nearestSundayToFeb1(year + 1);
    const weeks = (epochDay(end) - epochDay(start)) / 7;
    const periodWeeks = pattern.slice();
    if (weeks === 53) periodWeeks[11] += 1;
    const periods = [];
    let week = 1;
    let cursor = start;
    periodWeeks.forEach(function (count, index) {
      periods.push({ period: index + 1, quarter: Math.floor(index / 3) + 1, firstWeek: week, weeks: count, start: formatDate(cursor), end: formatDate(addDays(cursor, count * 7 - 1)) });
      week += count;
      cursor = addDays(cursor, count * 7);
    });
    return { year: year, pattern: patternName || '4-4-5', start: formatDate(start), end: formatDate(addDays(end, -1)), weeks: weeks, has53Weeks: weeks === 53, periods: periods };
  }

  function recurringDates(start, interval, unit, count, excluded) {
    const every = Math.trunc(Number(interval));
    const limit = Math.trunc(Number(count));
    if (!Number.isInteger(every) || every < 1 || every > 1000) throw new Error('Interval must be between 1 and 1,000.');
    if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new Error('Choose between 1 and 1,000 occurrences.');
    if (!['day', 'week', 'month'].includes(unit)) throw new Error('Choose days, weeks or months.');
    const omit = excluded || new Set();
    const dates = [];
    for (let step = 0; step < 10000 && dates.length < limit; step += 1) {
      const next = unit === 'day' ? addDays(start, step * every) : unit === 'week' ? addDays(start, step * every * 7) : addMonths(start, step * every);
      const key = formatDate(next);
      if (step > 0 && epochDay(next) > epochDay(addDays(start, 36500))) break;
      if (!omit.has(key)) dates.push(key);
    }
    return dates;
  }

  function parseCronField(raw, min, max, isDow) {
    const values = new Set();
    const wildcard = raw === '*' || raw.startsWith('*/');
    for (const part of raw.split(',')) {
      const bits = part.split('/');
      if (bits.length > 2) throw new Error('A cron field has too many step separators.');
      const step = bits[1] === undefined ? 1 : Number(bits[1]);
      if (!Number.isInteger(step) || step < 1 || step > max - min + 1) throw new Error('Cron steps must be a positive integer in range.');
      const range = bits[0];
      let from; let to;
      if (range === '*') { from = min; to = max; }
      else if (range.includes('-')) {
        const pair = range.split('-');
        if (pair.length !== 2) throw new Error('Invalid cron range.');
        from = Number(pair[0]); to = Number(pair[1]);
      } else {
        from = Number(range); to = bits[1] === undefined ? from : max;
      }
      if (!Number.isInteger(from) || !Number.isInteger(to) || from < min || to > max || from > to) throw new Error('Cron field value is outside ' + min + '–' + max + '.');
      for (let value = from; value <= to; value += step) values.add(isDow && value === 7 ? 0 : value);
    }
    return { values: values, wildcard: wildcard };
  }

  function parseCron(expression) {
    const fields = String(expression || '').trim().split(/\s+/);
    if (fields.length !== 5) throw new Error('Use standard five-field cron: minute hour day-of-month month day-of-week.');
    const parsed = [parseCronField(fields[0], 0, 59), parseCronField(fields[1], 0, 23), parseCronField(fields[2], 1, 31), parseCronField(fields[3], 1, 12), parseCronField(fields[4], 0, 7, true)];
    return { source: fields.join(' '), minute: parsed[0], hour: parsed[1], dayOfMonth: parsed[2], month: parsed[3], dayOfWeek: parsed[4] };
  }

  function cronMatchesDate(cron, date) {
    if (!cron.month.values.has(date.getUTCMonth() + 1)) return false;
    const domMatch = cron.dayOfMonth.values.has(date.getUTCDate());
    const dowMatch = cron.dayOfWeek.values.has(weekday(date));
    if (cron.dayOfMonth.wildcard && cron.dayOfWeek.wildcard) return true;
    if (cron.dayOfMonth.wildcard) return dowMatch;
    if (cron.dayOfWeek.wildcard) return domMatch;
    return domMatch || dowMatch;
  }

  function cronNext(expression, fromInstant, count, maxDays) {
    const cron = typeof expression === 'string' ? parseCron(expression) : expression;
    const results = [];
    const max = Math.min(Math.max(Number(count) || 1, 1), 100);
    const limit = Math.min(Math.max(Number(maxDays) || 90, 1), 366);
    let cursor = Math.ceil(fromInstant.getTime() / 60000) * 60000;
    const stop = cursor + limit * DAY_MS;
    while (cursor < stop && results.length < max) {
      const date = new Date(cursor);
      if (cronMatchesDate(cron, date) && cron.hour.values.has(date.getUTCHours()) && cron.minute.values.has(date.getUTCMinutes())) results.push(date.toISOString().slice(0, 16) + 'Z');
      cursor += 60000;
    }
    return results;
  }

  function cronMonth(expression, year, month) {
    if (!Number.isInteger(year) || year < 1 || year > 9999 || !Number.isInteger(month) || month < 1 || month > 12) throw new Error('Cron month needs a supported year and month.');
    const cron = typeof expression === 'string' ? parseCron(expression) : expression;
    const result = [];
    for (let day = 1; day <= daysInMonth(year, month); day += 1) {
      const date = utcDate(year, month, day);
      if (!cronMatchesDate(cron, date)) continue;
      const times = [];
      cron.hour.values.forEach(function (hour) {
        cron.minute.values.forEach(function (minute) {
          if (times.length < 8) times.push(String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0') + ' UTC');
        });
      });
      result.push({ date: formatDate(date), times: times, more: cron.hour.values.size * cron.minute.values.size > times.length });
    }
    return result;
  }

  function excelSerialToDate(serial) {
    const value = Number(serial);
    if (!Number.isFinite(value) || value < 1 || value > 2958465) throw new Error('Enter an Excel 1900-system serial from 1 to 2,958,465.');
    const whole = Math.floor(value);
    if (whole === 60) return { date: '1900-02-29', note: 'Excel compatibility date: the fictitious 1900-02-29 is preserved as a special case.' };
    const days = whole > 60 ? whole - 1 : whole;
    return { date: formatDate(addDays(utcDate(1899, 12, 31), days)), note: 'Excel 1900 date system; fractional part represents time of day.' };
  }

  function dateToExcelSerial(date) {
    const days = epochDay(date) - epochDay(utcDate(1899, 12, 31));
    return days >= 60 ? days + 1 : days;
  }

  function ordinalToDate(value) {
    const match = /^(\d{4})-(\d{3})$/.exec(String(value).trim());
    if (!match) throw new Error('Use the Gregorian ordinal form YYYY-DDD.');
    const year = Number(match[1]); const ordinal = Number(match[2]);
    if (ordinal < 1 || ordinal > (leapYear(year) ? 366 : 365)) throw new Error('That ordinal day does not exist in the selected year.');
    return addDays(utcDate(year, 1, 1), ordinal - 1);
  }

  function convertInput(kind, raw) {
    const value = String(raw || '').trim();
    if (!value) throw new Error('Enter a value to convert.');
    if (kind === 'civil') {
      const date = parseCivilDate(value); const week = isoWeek(date);
      return { primary: value, rows: [['Weekday', WEEKDAYS[weekday(date)]], ['ISO week', String(week.year) + '-W' + String(week.week).padStart(2, '0')], ['Day of year', String(dayOfYear(date)).padStart(3, '0')], ['Excel serial', String(dateToExcelSerial(date))], ['Unix milliseconds (UTC midnight)', String(date.getTime())]] };
    }
    if (kind === 'excel') {
      const result = excelSerialToDate(value);
      return { primary: result.date, rows: [['Interpretation', result.note]] };
    }
    if (kind === 'ordinal') {
      const date = ordinalToDate(value);
      return { primary: formatDate(date), rows: [['Weekday', WEEKDAYS[weekday(date)]], ['ISO week', (isoWeek(date).year) + '-W' + String(isoWeek(date).week).padStart(2, '0')]] };
    }
    if (kind === 'iso') {
      const date = parseCivilDate(value.slice(0, 10));
      if (!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)) throw new Error('Enter an ISO 8601 date or timestamp.');
      if (value.length > 10 && !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)) throw new Error('Include Z or a UTC offset so the timestamp is not interpreted in an ambiguous local timezone.');
      const instant = value.length > 10 ? new Date(value) : date;
      if (!Number.isFinite(instant.getTime())) throw new Error('That ISO 8601 value is invalid.');
      return { primary: instant.toISOString(), rows: [['Unix seconds', String(Math.floor(instant.getTime() / 1000))], ['Unix milliseconds', String(instant.getTime())], ['UTC civil date', formatDate(instant)]] };
    }
    if (['unix-s', 'unix-ms', 'unix-us', 'unix-ns'].includes(kind)) {
      if (!/^-?\d+$/.test(value)) throw new Error('Unix timestamp input must be an integer.');
      const rawInteger = BigInt(value);
      const factor = { 'unix-s': 1000000000n, 'unix-ms': 1000000n, 'unix-us': 1000n, 'unix-ns': 1n }[kind];
      const nanoseconds = rawInteger * factor;
      const milliseconds = nanoseconds >= 0n ? nanoseconds / 1000000n : -((-nanoseconds + 999999n) / 1000000n);
      if (milliseconds < -8640000000000000n || milliseconds > 8640000000000000n) throw new Error('That timestamp is outside the JavaScript date range.');
      const date = new Date(Number(milliseconds));
      return { primary: date.toISOString(), rows: [['Unix seconds', (nanoseconds / 1000000000n).toString()], ['Unix milliseconds', (nanoseconds / 1000000n).toString()], ['Unix microseconds', (nanoseconds / 1000n).toString()], ['Unix nanoseconds', nanoseconds.toString()]] };
    }
    if (kind === 'filetime') {
      if (!/^\d+$/.test(value)) throw new Error('FILETIME input must be a non-negative integer.');
      const ticks = BigInt(value);
      const unixMs = ticks / 10000n - 11644473600000n;
      if (unixMs < -8640000000000000n || unixMs > 8640000000000000n) throw new Error('That FILETIME value is outside the JavaScript date range.');
      const date = new Date(Number(unixMs));
      return { primary: date.toISOString(), rows: [['FILETIME ticks', ticks.toString()], ['Unix milliseconds', unixMs.toString()]] };
    }
    throw new Error('Choose one of the supported formats.');
  }

  function csvEscape(value) { const text = String(value == null ? '' : value); const safe = /^[=+@\-\t\r]/.test(text) ? "'" + text : text; return '"' + safe.replace(/"/g, '""') + '"'; }
  function toCSV(rows) { return rows.map(function (row) { return row.map(csvEscape).join(','); }).join('\r\n') + '\r\n'; }
  function escapeHTML(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]; }); }
  function escapeICS(value) { return String(value == null ? '' : value).replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,'); }

  function foldICSLine(line) {
    const segments = []; let current = ''; let bytes = 0;
    for (const point of String(line)) {
      const size = new TextEncoder().encode(point).length;
      if (bytes + size > 75) { segments.push(current); current = ' ' + point; bytes = 1 + size; }
      else { current += point; bytes += size; }
    }
    segments.push(current);
    return segments.join('\r\n');
  }

  function makeICS(title, dates) {
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Make a Calendar//ChronoStudio Pro//EN', 'CALSCALE:GREGORIAN'];
    dates.forEach(function (date, index) { lines.push('BEGIN:VEVENT', 'UID:chronostudio-' + date.replace(/-/g, '') + '-' + index + '@make-a-calendar.com', 'DTSTAMP:' + stamp, 'DTSTART;VALUE=DATE:' + date.replace(/-/g, ''), 'SUMMARY:' + escapeICS(title), 'END:VEVENT'); });
    lines.push('END:VCALENDAR');
    return lines.map(foldICSLine).join('\r\n') + '\r\n';
  }

  function makeCalendarSVG(year, month, weekStart, title, layout) {
    if (!Number.isInteger(year) || year < 1 || year > 9998 || !Number.isInteger(month) || month < 1 || month > 12 || ![0, 1].includes(weekStart)) throw new Error('Calendar export needs a supported year, month and week start.');
    const start = weekStart === 1 ? 1 : 0;
    const cells = monthGrid(year, month, start);
    const names = start === 1 ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const rowCount = cells.length / 7;
    const presets = {
      'Minimal Editorial': { background:'#fbfaf6', ink:'#172b3d', muted:'#4b6572', line:'#d8e1df', cell:'#ffffff', height:92, titleSize:28 },
      'Corporate Planner': { background:'#ffffff', ink:'#17354a', muted:'#315b70', line:'#b8cbd5', cell:'#f7fafb', height:94, titleSize:25 },
      'Academic Planner': { background:'#f8fbf6', ink:'#243b2b', muted:'#43664a', line:'#c6d6c0', cell:'#ffffff', height:112, titleSize:27 },
      'Ink Saver': { background:'#ffffff', ink:'#111111', muted:'#333333', line:'#555555', cell:'#ffffff', height:82, titleSize:24 }
    };
    const preset = presets[layout] || presets['Minimal Editorial'];
    const width = 840; const cellW = 120; const cellH = preset.height; const top = 124;
    const holidays = new Map();
    for (let holidayYear = year - 1; holidayYear <= year + 1; holidayYear += 1) usFederalHolidays(holidayYear).forEach(function (item) { holidays.set(item.date, item.name); });
    let body = '<rect width="100%" height="100%" fill="' + preset.background + '"/><text x="36" y="52" font-family="system-ui,sans-serif" font-size="' + preset.titleSize + '" font-weight="700" fill="' + preset.ink + '">' + escapeHTML(title || (MONTHS[month - 1] + ' ' + year)) + '</text>';
    names.forEach(function (name, i) { body += '<text x="' + (36 + i * cellW + 8) + '" y="94" font-family="system-ui,sans-serif" font-size="14" fill="' + preset.muted + '">' + name + '</text>'; });
    cells.forEach(function (date, i) {
      const row = Math.floor(i / 7); const col = i % 7; const x = 32 + col * cellW; const y = top + row * cellH;
      const inMonth = date.getUTCMonth() + 1 === month;
      const holiday = holidays.get(formatDate(date));
      body += '<rect x="' + x + '" y="' + y + '" width="' + cellW + '" height="' + cellH + '" fill="' + preset.cell + '" stroke="' + preset.line + '"/>';
      body += '<text x="' + (x + 12) + '" y="' + (y + 28) + '" font-family="system-ui,sans-serif" font-size="18" fill="' + (inMonth ? preset.ink : '#aab4b3') + '">' + date.getUTCDate() + '</text>';
      if (holiday) body += '<text x="' + (x + 12) + '" y="' + (y + 48) + '" font-family="system-ui,sans-serif" font-size="9" fill="' + preset.muted + '" textLength="98" lengthAdjust="spacingAndGlyphs">' + escapeHTML(holiday.length > 20 ? holiday.slice(0, 19) + '…' : holiday) + '</text>';
    });
    const height = top + rowCount * cellH + 30;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="' + escapeHTML(title || (MONTHS[month - 1] + ' ' + year)) + '">' + body + '</svg>';
  }

  function pageContext(path) {
    const lower = String(path || '/').toLowerCase();
    if (lower === '/' || lower === '/index.html') return { label: 'Make a Calendar', module: 'dashboard', summary: 'Choose a tool for the calendar you are working on.' };
    if (/business-days/.test(lower)) return { label: 'Business-day calculator', module: 'workdays', summary: 'Compare a local workday count with this page.' };
    if (/pay-period/.test(lower)) return { label: 'Pay period calendar', module: 'payroll', summary: 'Plan nominal and adjusted pay dates.' };
    if (/shift-calendar/.test(lower)) return { label: 'Shift calendar', module: 'shifts', summary: 'Map a repeating work cycle.' };
    if (/445-calendar|fiscal-calendar/.test(lower)) return { label: 'Fiscal calendar', module: 'fiscal', summary: 'Compare week patterns and fiscal periods.' };
    if (/cron/.test(lower)) return { label: 'Cron tools', module: 'cron', summary: 'Visualize a five-field schedule in UTC.' };
    if (/converters|excel-date/.test(lower)) return { label: 'Date converters', module: 'converters', summary: 'Inspect timestamps and spreadsheet serials.' };
    if (/ical-generator/.test(lower)) return { label: 'ICS generator', module: 'recurrence', summary: 'Generate date-only events locally.' };
    if (/recurring-dates/.test(lower)) return { label: 'Recurring dates', module: 'recurrence', summary: 'Build a bounded date recurrence.' };
    if (/blank-calendar/.test(lower)) return { label: 'Blank calendar', module: 'print', summary: 'Compose and export a printable grid.' };
    if (/monthly-calendars|yearly-calendars/.test(lower)) return { label: 'Calendar page', module: 'calendar', summary: 'Inspect the current civil-date grid.' };
    return { label: 'Calendar workbench', module: 'calendar', summary: 'Create a local calendar and inspect dates.' };
  }

  function safeJSON(storage) {
    try {
      const value = JSON.parse(storage.getItem(STORAGE_KEY) || '{}');
      return { notes: Array.isArray(value.notes) ? value.notes.filter(function (item) { return item && typeof item.id === 'string' && typeof item.title === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.date); }).slice(0, 2000) : [], favorites: Array.isArray(value.favorites) ? value.favorites.filter(function (url) { return RESOURCE_LIST.some(function (item) { return item.url === url; }); }) : [], recent: Array.isArray(value.recent) ? value.recent.filter(function (url) { return RESOURCE_LIST.some(function (item) { return item.url === url; }); }).slice(0, 12) : [], weekStart: value.weekStart === 1 ? 1 : 0, highContrast: Boolean(value.highContrast), shortcutEnabled: value.shortcutEnabled !== false };
    } catch (_) {
      return { notes: [], favorites: [], recent: [], weekStart: 0, highContrast: false, shortcutEnabled: true };
    }
  }

  const API = { parseCivilDate, formatDate, epochDay, fromEpochDay, addDays, addMonths, daysInMonth, weekday, leapYear, dayOfYear, isoWeek, monthGrid, usFederalHolidays, isBusinessDay, countBusinessDays, addBusinessDays, nearestSundayToFeb1, fiscalCalendar, recurringDates, parseCron, cronMatchesDate, cronNext, cronMonth, excelSerialToDate, dateToExcelSerial, ordinalToDate, convertInput, csvEscape, toCSV, escapeHTML, escapeICS, foldICSLine, makeICS, makeCalendarSVG, pageContext, RESOURCE_LIST, safeJSON };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (global.location && global.location.hostname !== 'make-a-calendar.com' && !global.__CHRONOSTUDIO_DEMO__) return;

  function boot() {
    if (document.getElementById('chronostudio-pro-host')) return;
    let state;
    try { state = safeJSON(window.localStorage); }
    catch (_) { state = { notes: [], favorites: [], recent: [], weekStart: 0, highContrast: false, shortcutEnabled: true }; }
    const today = new Date();
    const todayCivil = utcDate(today.getFullYear(), today.getMonth() + 1, today.getDate());
    let context = pageContext(window.location.pathname);
    const host = document.createElement('div'); host.id = 'chronostudio-pro-host';
    const shadow = host.attachShadow({ mode: 'open' });
    document.documentElement.appendChild(host);

    const style = document.createElement('style');
    style.textContent = `
      :host{all:initial;color:#172b3d;font:14px/1.45 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;--ink:#172b3d;--muted:#60737a;--line:#dce5e2;--paper:#fbfaf6;--white:#fff;--teal:#137c78;--teal2:#e3f1ee;--warn:#9f4f2c;--shadow:0 18px 60px rgba(22,42,52,.22)}
      *{box-sizing:border-box}button,input,select,textarea{font:inherit}button{cursor:pointer}button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,a:focus-visible{outline:3px solid #67c9bf;outline-offset:2px}
      #launch{position:fixed;z-index:2147483000;right:22px;bottom:22px;border:0;border-radius:999px;background:#153344;color:#fff;padding:12px 17px;box-shadow:var(--shadow);font-weight:700;letter-spacing:.01em}#launch:hover{background:#205064}
      #panel{position:fixed;z-index:2147483001;right:20px;bottom:82px;width:min(1040px,calc(100vw - 32px));height:min(760px,calc(100vh - 110px));min-height:420px;display:none;grid-template-rows:auto 1fr auto;background:var(--paper);border:1px solid #cddbd8;border-radius:18px;box-shadow:var(--shadow);overflow:hidden;color:var(--ink)}
      #panel.open{display:grid}.contrast{--paper:#fff;--ink:#000;--muted:#303030;--line:#555;--teal:#005b55;--teal2:#cdeee8}
      header{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;background:#fff;border-bottom:1px solid var(--line)}.brand{display:flex;gap:12px;align-items:center}.mark{width:36px;height:36px;border-radius:12px;display:grid;place-items:center;background:#e3f1ee;color:#0f625f;font-size:18px;font-weight:800}.brand strong{font-size:16px;display:block;line-height:1.2}.brand small{color:var(--muted)}.head-actions{display:flex;gap:7px}.iconbtn{border:1px solid var(--line);background:white;color:var(--ink);border-radius:9px;padding:7px 10px}.command-shade{position:fixed;z-index:2147483002;inset:0;background:rgba(14,31,40,.32);display:grid;place-items:start center;padding:12vh 16px 16px}.command-shade[hidden]{display:none!important}.command-box{width:min(520px,100%);background:#fff;border-radius:14px;box-shadow:var(--shadow);padding:12px}.command-box input{width:100%;border:1px solid #bacbc7;border-radius:9px;padding:12px;color:var(--ink)}.command-list{margin-top:8px;max-height:55vh;overflow:auto}.command-list button{width:100%;text-align:left;padding:10px;border:0;border-radius:8px;background:#fff;color:var(--ink)}.command-list button:hover,.command-list button[aria-selected=true]{background:var(--teal2)}
      .layout{display:grid;grid-template-columns:178px minmax(0,1fr);min-height:0}.nav{padding:12px 9px;border-right:1px solid var(--line);overflow:auto;background:#f5f6f1}.nav button{display:block;width:100%;text-align:left;border:0;background:transparent;color:#405760;border-radius:8px;padding:8px 9px;margin:2px 0;font-size:13px}.nav button:hover{background:#e9f0ed}.nav button.active{background:var(--teal2);color:#125d5a;font-weight:700}.workspace{padding:20px 22px;overflow:auto;min-width:0}.status{display:flex;justify-content:space-between;gap:12px;border-top:1px solid var(--line);background:#fff;color:var(--muted);font-size:12px;padding:8px 14px}.status span:last-child{text-align:right}
      h1{font-size:24px;line-height:1.2;margin:0 0 6px;letter-spacing:-.025em}h2{font-size:17px;margin:0 0 10px}h3{font-size:14px;margin:0 0 8px}.lead{color:var(--muted);margin:0 0 18px}.eyebrow{text-transform:uppercase;color:var(--teal);font-size:10px;font-weight:800;letter-spacing:.12em;margin-bottom:7px}.cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:14px 0}.card{border:1px solid var(--line);background:var(--white);border-radius:13px;padding:14px}.card p{margin:5px 0;color:var(--muted)}.metric{font-size:26px;font-weight:750;letter-spacing:-.04em}.grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.row{display:flex;gap:10px;align-items:end;flex-wrap:wrap}.field{display:flex;flex-direction:column;gap:5px;min-width:130px;flex:1}.field label,.label{color:#405760;font-weight:650;font-size:12px}.field input,.field select,.field textarea,input.control,select.control,textarea.control{border:1px solid #bacbc7;background:white;border-radius:8px;padding:9px 10px;color:var(--ink);min-height:38px;min-width:0}.field textarea{min-height:68px;resize:vertical}.actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:12px 0}.btn{border:1px solid #b7cac5;background:#fff;color:#21424b;border-radius:8px;padding:8px 11px;font-weight:650}.btn.primary{background:#136d68;color:white;border-color:#136d68}.btn.subtle{background:#edf4f1}.btn.danger{color:#8d3825;border-color:#e8c5ba}.help{font-size:12px;color:var(--muted);margin:8px 0}.notice{padding:10px 12px;border-radius:9px;background:#eaf3f0;color:#27534f;margin:10px 0}.error{background:#fff0e8;color:#853f26}.result{margin-top:14px}.table-wrap{overflow:auto;border:1px solid var(--line);border-radius:10px;background:#fff}table{border-collapse:collapse;width:100%;font-size:12px}th,td{text-align:left;vertical-align:top;padding:8px 10px;border-bottom:1px solid var(--line)}th{background:#f2f6f4;color:#39535c;font-weight:750;position:sticky;top:0}tr:last-child td{border-bottom:0}.calendar{width:100%;table-layout:fixed}.calendar th,.calendar td{text-align:center;padding:7px 2px}.day{border:1px solid transparent;background:transparent;color:var(--ink);width:34px;height:34px;border-radius:9px}.day:hover{background:#e3f1ee}.day.out{color:#aab4b3}.day.weekend{color:#567078}.day.selected{background:#136d68;color:white}.day.today{box-shadow:inset 0 0 0 1px #136d68}.day.holiday{position:relative}.day.holiday:after{content:"";display:block;width:4px;height:4px;border-radius:100%;background:#d16a41;position:absolute;bottom:2px;left:calc(50% - 2px)}.resource{display:flex;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid var(--line)}.resource a{font-weight:700;color:#116c67;text-decoration:none}.resource a:hover{text-decoration:underline}.resource small{display:block;color:var(--muted);margin-top:3px}.pill{display:inline-block;border-radius:999px;background:#edf2f0;padding:3px 7px;color:#546a6f;font-size:10px}.note{display:flex;justify-content:space-between;gap:10px;padding:10px;border:1px solid var(--line);border-radius:10px;background:white;margin:8px 0}.note strong{display:block}.empty{padding:24px;text-align:center;color:var(--muted)}.split{display:grid;grid-template-columns:minmax(240px,.82fr) minmax(0,1.18fr);gap:18px}.kpis{display:flex;gap:8px;flex-wrap:wrap}.kbd{font:11px ui-monospace,monospace;border:1px solid var(--line);border-bottom-width:2px;background:#fff;padding:2px 5px;border-radius:5px}.visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
      @media(max-width:700px){#panel{right:8px;left:8px;bottom:72px;width:auto;height:calc(100vh - 88px);min-height:0;border-radius:14px}.layout{grid-template-columns:1fr;grid-template-rows:auto 1fr}.nav{display:flex;gap:4px;overflow-x:auto;border-right:0;border-bottom:1px solid var(--line);padding:7px}.nav button{white-space:nowrap;width:auto;flex:0 0 auto;margin:0}.workspace{padding:16px 13px}.cards{grid-template-columns:1fr 1fr}.grid2,.split{grid-template-columns:1fr}.status{font-size:10px}header{padding:11px 12px}.brand small{display:none}.head-actions .wide{display:none}}
      @media(max-width:420px){.cards{grid-template-columns:1fr 1fr}.metric{font-size:22px}.field{min-width:115px}.status span:last-child{display:none}}
      @media(prefers-reduced-motion:reduce){*,*:before,*:after{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
      @media print{#launch,#panel{display:none!important}}
    `;
    shadow.appendChild(style);
    const launch = document.createElement('button'); launch.id = 'launch'; launch.type = 'button'; launch.textContent = '◷ ChronoStudio'; launch.setAttribute('aria-label', 'Open ChronoStudio Pro');
    shadow.appendChild(launch);
    const panel = document.createElement('section'); panel.id = 'panel'; panel.setAttribute('aria-label', 'ChronoStudio Pro calendar workbench'); panel.setAttribute('aria-hidden', 'true');
    panel.innerHTML = '<header><div class="brand"><div class="mark" aria-hidden="true">C</div><div><strong>ChronoStudio Pro</strong><small>' + escapeHTML(context.label) + ' · local-first</small></div></div><div class="head-actions"><button class="iconbtn" data-action="command-palette" aria-label="Open command palette">⌕</button><button class="iconbtn wide" data-action="minimize" aria-label="Minimize panel">Minimize</button><button class="iconbtn" data-action="close" aria-label="Close panel">×</button></div></header><div class="layout"><nav class="nav" aria-label="Workbench tools"></nav><main class="workspace" tabindex="-1" id="view" aria-live="polite"></main></div><div class="status"><span>Offline calculations · Notes stay in this browser</span><span id="status-message" role="status">Ready</span></div><div class="command-shade" id="command-overlay" hidden><section class="command-box" role="dialog" aria-label="ChronoStudio command palette"><label class="visually-hidden" for="command-search">Search tools</label><input id="command-search" type="search" placeholder="Search tools…" autocomplete="off"><div class="command-list" id="command-list" role="listbox"></div><p class="help">Use ↑ and ↓ to move, Enter to open, Escape to close.</p></section></div>';
    shadow.appendChild(panel);
    const nav = panel.querySelector('.nav'); const view = panel.querySelector('#view'); const status = panel.querySelector('#status-message'); const commandOverlay=panel.querySelector('#command-overlay'); const commandInput=panel.querySelector('#command-search'); const commandList=panel.querySelector('#command-list'); const commandButton=panel.querySelector('[data-action="command-palette"]'); let commandIndex=0; let commandMatches=[];
    const navItems = [['dashboard','Overview'],['calendar','Calendar Studio'],['inspector','Date Inspector'],['workdays','Business Days'],['fiscal','Fiscal Lab'],['payroll','Payroll'],['shifts','Shift Rotations'],['recurrence','Recurrence & ICS'],['cron','Cron Lab'],['converters','Converters'],['planner','Local Planner'],['print','Print & Export'],['resources','Resources'],['settings','Settings']];
    let activeModule = context.module || 'dashboard'; let selectedDate = todayCivil; let plannerFilter = ''; let editingNoteId = null;
    const monthsSelect = MONTHS.map(function (name, index) { return '<option value="' + (index + 1) + '">' + name + '</option>'; }).join('');
    function saveState() { try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) { setStatus('Storage is unavailable; your current edits are not saved.', true); } }
    function setStatus(message, isError) { status.textContent = message; status.parentElement.style.color = isError ? '#853f26' : ''; }
    function input(id, label, value, type) { return '<div class="field"><label for="' + id + '">' + label + '</label><input id="' + id + '" type="' + (type || 'text') + '" value="' + escapeHTML(value) + '"></div>'; }
    function select(id, label, options, value) { return '<div class="field"><label for="' + id + '">' + label + '</label><select id="' + id + '">' + options.map(function (item) { return '<option value="' + escapeHTML(item[0]) + '"' + (item[0] === value ? ' selected' : '') + '>' + escapeHTML(item[1]) + '</option>'; }).join('') + '</select></div>'; }
    function check(id, label, checked) { return '<label class="label"><input id="' + id + '" type="checkbox"' + (checked ? ' checked' : '') + '> ' + label + '</label>'; }
    function button(label, action, primary) { return '<button type="button" class="btn' + (primary ? ' primary' : '') + '" data-action="' + action + '">' + label + '</button>'; }
    function datePicker(id, label, date) { return input(id, label, formatDate(date), 'date'); }
    function card(title, body) { return '<article class="card"><h3>' + title + '</h3>' + body + '</article>'; }
    function fail(message) { return '<div class="notice error" role="alert">' + escapeHTML(message) + '</div>'; }
    function setView(html) { view.innerHTML = html; view.scrollTop = 0; }
    function navHTML() { nav.innerHTML = navItems.map(function (item) { return '<button type="button" data-module="' + item[0] + '" class="' + (activeModule === item[0] ? 'active' : '') + '" aria-current="' + (activeModule === item[0] ? 'page' : 'false') + '">' + item[1] + '</button>'; }).join(''); }

    function dashboard() {
      const holidayCount = usFederalHolidays(todayCivil.getUTCFullYear()).filter(function (item) { return item.date.slice(0, 4) === String(todayCivil.getUTCFullYear()); }).length;
      const week = isoWeek(todayCivil);
      setView('<div class="eyebrow">Calendar workbench</div><h1>Plan dates with more context.</h1><p class="lead">' + escapeHTML(context.summary) + ' ChronoStudio adds independent date math, scheduling and export tools beside the site you are using.</p><div class="cards">' + card('Today', '<div class="metric">' + escapeHTML(formatDate(todayCivil)) + '</div><p>' + WEEKDAYS[weekday(todayCivil)] + ' · ISO ' + week.year + '-W' + String(week.week).padStart(2, '0') + '</p>') + card('This year', '<div class="metric">' + (leapYear(todayCivil.getUTCFullYear()) ? 366 : 365) + '</div><p>civil days · ' + holidayCount + ' US federal dates in the list</p>') + card('Your workspace', '<div class="metric">' + state.notes.length + '</div><p>local planning notes saved in this browser</p>') + '</div><div class="grid2">' + card('Start with a date', '<p>Inspect ISO weeks and year position, compare two civil dates, or count workdays with explicit range rules.</p><div class="actions">' + button('Inspect a date','go-inspector',true) + button('Count workdays','go-workdays') + '</div>') + card('Build a schedule', '<p>Plan fiscal periods, paydays, rotating shifts and bounded recurring dates. Export a dated plan as CSV, JSON, ICS or a printable layout.</p><div class="actions">' + button('Open Calendar Studio','go-calendar',true) + button('Open resources','go-resources') + '</div>') + '</div><p class="help">No account connection, tracking, remote APIs or automatic page changes. The launcher stays closed until you open it.</p>');
    }

    function calendarView() {
      const year = Number(view.querySelector('#cal-year') && view.querySelector('#cal-year').value || todayCivil.getUTCFullYear());
      const month = Number(view.querySelector('#cal-month') && view.querySelector('#cal-month').value || todayCivil.getUTCMonth() + 1);
      const weekStart = Number(view.querySelector('#cal-week-start') && view.querySelector('#cal-week-start').value || state.weekStart);
      if (!Number.isInteger(year) || year < 1 || year > 9998 || !Number.isInteger(month) || month < 1 || month > 12 || ![0,1].includes(weekStart)) throw new Error('Choose a year from 1 to 9998, a valid month and a supported week start.');
      const holidays = new Map();
      for (let holidayYear = year - 1; holidayYear <= year + 1; holidayYear += 1) usFederalHolidays(holidayYear).forEach(function (item) { holidays.set(item.date, item.name); });
      const days = monthGrid(year, month, weekStart); const names = weekStart === 1 ? ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      const rows = [];
      for (let i = 0; i < days.length; i += 7) {
        const week = isoWeek(days[i]);
        rows.push('<tr><th scope="row" title="ISO week">' + week.week + '</th>' + days.slice(i, i + 7).map(function (date) {
          const key = formatDate(date); const inMonth = date.getUTCMonth() + 1 === month; const classes = ['day'];
          const holiday = holidays.get(key);
          if (!inMonth) classes.push('out'); if (weekday(date) === 0 || weekday(date) === 6) classes.push('weekend'); if (key === formatDate(todayCivil)) classes.push('today'); if (key === formatDate(selectedDate)) classes.push('selected'); if (holiday) classes.push('holiday');
          return '<td><button type="button" class="' + classes.join(' ') + '" data-date="' + key + '" title="' + escapeHTML(holiday || key) + '" aria-label="' + WEEKDAYS[weekday(date)] + ' ' + key + (holiday ? ', ' + escapeHTML(holiday) : '') + '">' + date.getUTCDate() + '</button></td>';
        }).join('') + '</tr>');
      }
      setView('<div class="eyebrow">Calendar Studio</div><h1>' + MONTHS[month - 1] + ' ' + year + '</h1><p class="lead">A civil-date grid with ISO week labels. Selecting a cell never changes the site calendar.</p><div class="row">' + input('cal-year','Year',year,'number') + '<div class="field"><label for="cal-month">Month</label><select id="cal-month">' + monthsSelect.replace('value="' + month + '"','value="' + month + '" selected') + '</select></div>' + select('cal-week-start','Week starts', [['0','Sunday'],['1','Monday']], String(weekStart)) + '</div><div class="actions">' + button('Update grid','refresh-calendar',true) + button('Download SVG','export-svg') + button('Download CSV','export-calendar-csv') + button('Download JSON','export-calendar-json') + button('Open print preview','print-calendar') + '</div><div class="table-wrap"><table class="calendar" aria-label="' + MONTHS[month - 1] + ' ' + year + '"><thead><tr><th scope="col">ISO</th>' + names.map(function (name) { return '<th scope="col">' + name + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.join('') + '</tbody></table></div><p class="help">Orange dot marks dates in the deterministic US federal holiday calculation. Observed dates are planning references; verify employer or contract rules.</p><div class="actions"><button type="button" class="btn subtle" data-action="inspect-selected">Inspect ' + escapeHTML(formatDate(selectedDate)) + '</button></div>');
      const monthControl = view.querySelector('#cal-month'); if (monthControl) monthControl.value = String(month);
    }

    function inspector() {
      const primary = selectedDate; const week = isoWeek(primary); const yearEnd = utcDate(primary.getUTCFullYear(), 12, 31); const monthEnd = utcDate(primary.getUTCFullYear(), primary.getUTCMonth() + 2, 0);
      const second = view.querySelector('#date-b') && view.querySelector('#date-b').value ? parseCivilDate(view.querySelector('#date-b').value) : null;
      const diff = second ? epochDay(second) - epochDay(primary) : null;
      setView('<div class="eyebrow">Date Inspector</div><h1>Inspect a civil date.</h1><p class="lead">Date-only math runs at UTC midnight internally so the selected calendar day does not drift with timezone.</p><div class="row">' + datePicker('inspect-date','Selected date',primary) + datePicker('date-b','Compare with',second || addDays(primary, 7)) + '<div class="actions">' + button('Inspect','inspect-run',true) + '</div></div><div class="cards">' + card('Gregorian', '<div class="metric">' + WEEKDAYS[weekday(primary)] + '</div><p>' + escapeHTML(formatDate(primary)) + '</p>') + card('ISO week', '<div class="metric">W' + String(week.week).padStart(2,'0') + '</div><p>ISO week-year ' + week.year + '</p>') + card('Year position', '<div class="metric">Day ' + dayOfYear(primary) + '</div><p>' + (leapYear(primary.getUTCFullYear()) ? 'Leap year · ' : 'Common year · ') + (epochDay(yearEnd)-epochDay(primary)) + ' days after today</p>') + '</div><div class="table-wrap"><table><tbody><tr><th>Days in month</th><td>' + daysInMonth(primary.getUTCFullYear(), primary.getUTCMonth() + 1) + '</td></tr><tr><th>Days remaining in month after this date</th><td>' + (epochDay(monthEnd)-epochDay(primary)) + '</td></tr><tr><th>Quarter</th><td>Q' + (Math.floor(primary.getUTCMonth()/3)+1) + '</td></tr><tr><th>Month weekday position</th><td>' + (Math.floor((primary.getUTCDate()-1 + (weekday(utcDate(primary.getUTCFullYear(),primary.getUTCMonth()+1,1)) + 6)%7)/7)+1) + '</td></tr><tr><th>Comparison</th><td>' + (diff === null ? 'Choose a second date.' : (diff >= 0 ? diff + ' days after' : Math.abs(diff) + ' days before') + ' the selected date.') + '</td></tr></tbody></table></div><div class="actions">' + button('Copy structured result','copy-inspection') + button('Save as note','note-inspection') + '</div>');
    }

    function workdays() {
      const startDefault = addDays(todayCivil, -14); const endDefault = todayCivil;
      setView('<div class="eyebrow">Business Days</div><h1>Count workdays with visible assumptions.</h1><p class="lead">This is a deterministic planner, not legal, banking or contract advice. Default weekends are Saturday and Sunday.</p><div class="row">' + datePicker('work-start','Start date',startDefault) + datePicker('work-end','End date',endDefault) + input('business-offset','Add business days','10','number') + '</div><div class="actions">' + check('include-start','Include start date',true) + check('include-end','Include end date',true) + check('use-holidays','Exclude US federal observed dates',false) + check('weekend-sun','Sunday is weekend',true) + check('weekend-sat','Saturday is weekend',true) + '</div><div class="actions">' + button('Count range','count-workdays',true) + button('Add business days','add-workdays') + '</div><div class="result" id="work-result"></div><p class="help">Federal holiday rules are calculated locally. Custom company closures and jurisdiction-specific holidays are not included.</p><div class="actions"><a class="btn" href="https://make-a-calendar.com/business-days-calculator" target="_blank" rel="noopener">Open Make a Calendar business-day calculator</a></div>');
    }

    function fiscal() {
      const year = Number(view.querySelector('#fiscal-year') && view.querySelector('#fiscal-year').value || todayCivil.getUTCFullYear());
      const pattern = view.querySelector('#fiscal-pattern') && view.querySelector('#fiscal-pattern').value || '4-4-5';
      if (!Number.isInteger(year) || year < 1 || year > 9998) throw new Error('Choose a fiscal year from 1 to 9998.');
      const data = fiscalCalendar(year, pattern);
      setView('<div class="eyebrow">Fiscal Planning</div><h1>Retail fiscal calendar lab.</h1><p class="lead">Sunday-nearest-February 1 model. Periods follow the selected week pattern; a 53rd week extends period 12.</p><div class="row">' + input('fiscal-year','Fiscal year label',year,'number') + select('fiscal-pattern','Period pattern', [['4-4-5','4-4-5'],['4-5-4','4-5-4'],['5-4-4','5-4-4']], pattern) + '<div class="actions">' + button('Recalculate','refresh-fiscal',true) + button('Export CSV','export-fiscal') + button('Export JSON','export-fiscal-json') + '</div></div><div class="cards">' + card('Fiscal start','<div class="metric">' + data.start + '</div><p>Sunday nearest February 1</p>') + card('Fiscal end','<div class="metric">' + data.end + '</div><p>Final included civil date</p>') + card('Year length','<div class="metric">' + data.weeks + ' weeks</div><p>' + (data.has53Weeks ? '53rd week assigned to period 12' : '52-week year') + '</p>') + '</div><div class="table-wrap"><table><thead><tr><th>Quarter</th><th>Period</th><th>Weeks</th><th>Fiscal week range</th><th>Start</th><th>End</th></tr></thead><tbody>' + data.periods.map(function (p) { return '<tr><td>Q' + p.quarter + '</td><td>P' + String(p.period).padStart(2,'0') + '</td><td>' + p.weeks + '</td><td>' + p.firstWeek + '–' + (p.firstWeek+p.weeks-1) + '</td><td>' + p.start + '</td><td>' + p.end + '</td></tr>'; }).join('') + '</tbody></table></div><p class="help">This is an original NRF-style model, not an official or licensed NRF calendar. Compare the convention with the fiscal policy used by your organization.</p><p><a href="https://make-a-calendar.com/445-calendar" target="_blank" rel="noopener">Related 4-4-5 calendar resource</a></p>');
    }

    function payroll() {
      const year = Number(view.querySelector('#pay-year') && view.querySelector('#pay-year').value || todayCivil.getUTCFullYear());
      const frequency = view.querySelector('#pay-frequency') && view.querySelector('#pay-frequency').value || 'biweekly';
      const anchor = view.querySelector('#pay-anchor') && view.querySelector('#pay-anchor').value || formatDate(todayCivil);
      const adjust = view.querySelector('#pay-adjust') && view.querySelector('#pay-adjust').value || 'none';
      if (!Number.isInteger(year) || year < 1 || year > 9999) throw new Error('Choose a calendar year from 1 to 9999.');
      let rows = [];
      if (frequency === 'weekly' || frequency === 'biweekly') {
        const step = frequency === 'weekly' ? 7 : 14; const first = parseCivilDate(anchor); let date = first;
        if (epochDay(date) < epochDay(utcDate(year,1,1))) date = addDays(date, Math.ceil((epochDay(utcDate(year,1,1))-epochDay(date))/step)*step);
        while (date.getUTCFullYear() <= year && rows.length < 60) { if (date.getUTCFullYear() === year) rows.push(date); date = addDays(date, step); }
      } else {
        for (let month = 1; month <= 12; month += 1) {
          if (frequency === 'semimonthly') { rows.push(utcDate(year, month, 15)); rows.push(utcDate(year, month, daysInMonth(year,month))); }
          else rows.push(utcDate(year, month, Math.min(Number(view.querySelector('#pay-day') && view.querySelector('#pay-day').value || 1), daysInMonth(year,month))));
        }
      }
      const holidays = adjust === 'holiday-following' || adjust === 'holiday-preceding' ? holidaySetForRange(utcDate(year,1,1),utcDate(year,12,31)) : null;
      const direction = adjust === 'preceding' || adjust === 'holiday-preceding' ? -1 : 1;
      const data = rows.map(function (nominal) {
        let adjusted = nominal;
        if (adjust !== 'none') { let tries = 0; while (!isBusinessDay(adjusted,{weekendDays:[0,6],holidays:adjust === 'holiday-following'||adjust === 'holiday-preceding'?holidays:null}) && tries < 20) { adjusted = addDays(adjusted,direction); tries += 1; } }
        return { nominal: formatDate(nominal), adjusted: formatDate(adjusted) };
      });
      const monthlyCounts = new Map(); data.forEach(function (item) { const month = item.adjusted.slice(0,7); monthlyCounts.set(month,(monthlyCounts.get(month)||0)+1); });
      const threes = Array.from(monthlyCounts.entries()).filter(function (entry) { return entry[1] >= 3; }).map(function (entry) { return entry[0]; });
      setView('<div class="eyebrow">Payroll planner</div><h1>Preview pay dates.</h1><p class="lead">Shows nominal and adjusted dates only; no salary, tax, benefit or entitlement calculations.</p><div class="row">' + input('pay-year','Calendar year',year,'number') + select('pay-frequency','Pay frequency',[['weekly','Weekly'],['biweekly','Every two weeks'],['semimonthly','Semi-monthly (15th and month end)'],['monthly','Monthly']],frequency) + datePicker('pay-anchor','Anchor date',parseCivilDate(anchor)) + select('pay-adjust','Weekend / holiday adjustment',[['none','No adjustment'],['following','Following weekday'],['preceding','Preceding weekday'],['holiday-following','Following weekday; US holidays'],['holiday-preceding','Preceding weekday; US holidays']],adjust) + '</div><div class="row">' + input('pay-day','Monthly day (monthly only)',view.querySelector('#pay-day') && view.querySelector('#pay-day').value || '1','number') + '<div class="actions">' + button('Build dates','refresh-payroll',true) + button('Export CSV','export-payroll') + '</div></div><div class="notice">' + (threes.length ? 'Three or more adjusted pay dates fall in: ' + threes.join(', ') : 'No month in this preview has three adjusted pay dates.') + '</div><div class="table-wrap"><table><thead><tr><th>#</th><th>Nominal</th><th>Adjusted</th></tr></thead><tbody>' + data.map(function (item,index) { return '<tr><td>' + (index+1) + '</td><td>' + item.nominal + '</td><td>' + item.adjusted + (item.nominal !== item.adjusted ? ' <span class="pill">adjusted</span>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>');
    }

    function shiftPattern(value) {
      if (value === '2-2-3') return '11001110011000';
      if (value === '4-on-3-off') return '1111000';
      if (value === '5-on-2-off') return '1111100';
      if (!/^[01]{2,42}$/.test(value)) throw new Error('Custom cycle must be 2–42 characters of 1 (on) and 0 (off).');
      return value;
    }

    function shifts() {
      const preset = view.querySelector('#shift-pattern') && view.querySelector('#shift-pattern').value || '2-2-3';
      const anchorText = view.querySelector('#shift-anchor') && view.querySelector('#shift-anchor').value || formatDate(todayCivil);
      const phase = Number(view.querySelector('#shift-phase') && view.querySelector('#shift-phase').value || 0);
      const start = view.querySelector('#shift-start') && view.querySelector('#shift-start').value || formatDate(todayCivil);
      const end = view.querySelector('#shift-end') && view.querySelector('#shift-end').value || formatDate(addDays(todayCivil, 30));
      let pattern; let list = [];
      try {
        pattern = shiftPattern(preset === 'custom' ? (view.querySelector('#shift-custom') && view.querySelector('#shift-custom').value || '') : preset);
        const a = parseCivilDate(anchorText); const first = parseCivilDate(start); const last = parseCivilDate(end);
        if (epochDay(last)-epochDay(first)>3660) throw new Error('Choose a shift range of ten years or less.');
        for (let date=first;epochDay(date)<=epochDay(last);date=addDays(date,1)) { let index=((epochDay(date)-epochDay(a)+phase)%pattern.length+pattern.length)%pattern.length; list.push({date:formatDate(date),status:pattern[index]==='1'?'On shift':'Off'}); }
      } catch (error) { list = []; pattern = ''; }
      setView('<div class="eyebrow">Shift Rotations</div><h1>Keep cycle phase across years.</h1><p class="lead">Anchor date and phase offset determine each day in the repeating mask. On-shift means a cycle label, not hours worked.</p><div class="row">' + select('shift-pattern','Pattern',[['2-2-3','2-2-3'],['4-on-3-off','4 on / 3 off'],['5-on-2-off','5 on / 2 off'],['custom','Custom mask']],preset) + datePicker('shift-anchor','Cycle anchor date',parseCivilDate(anchorText)) + input('shift-phase','Phase offset',phase,'number') + datePicker('shift-start','Range start',parseCivilDate(start)) + datePicker('shift-end','Range end',parseCivilDate(end)) + '</div><div class="row">' + input('shift-custom','Custom mask (1 on, 0 off)',view.querySelector('#shift-custom') && view.querySelector('#shift-custom').value || '1100','text') + '<div class="actions">' + button('Calculate rotation','refresh-shifts',true) + button('Export CSV','export-shifts') + button('Export ICS','export-shift-ics') + '</div></div><div id="shift-result">' + (pattern ? '<div class="notice">Cycle mask: <code>' + pattern + '</code> · ' + pattern.length + ' day(s)</div><div class="table-wrap"><table><thead><tr><th>Date</th><th>Cycle</th></tr></thead><tbody>' + list.map(function(item){return '<tr><td>'+item.date+'</td><td><span class="pill">'+item.status+'</span></td></tr>';}).join('') + '</tbody></table></div>' : fail('Check the cycle mask and selected date range.')) + '</div>');
      const custom = view.querySelector('#shift-custom'); if (custom && preset !== 'custom') custom.disabled = true;
    }

    function recurrence() {
      const startText = view.querySelector('#repeat-start') && view.querySelector('#repeat-start').value || formatDate(todayCivil);
      const every = view.querySelector('#repeat-every') && view.querySelector('#repeat-every').value || '2';
      const unit = view.querySelector('#repeat-unit') && view.querySelector('#repeat-unit').value || 'week';
      const count = view.querySelector('#repeat-count') && view.querySelector('#repeat-count').value || '12';
      const excludedText = view.querySelector('#repeat-excluded') && view.querySelector('#repeat-excluded').value || '';
      let dates = []; let error = '';
      try { const excluded = new Set(excludedText.split(/[\s,]+/).filter(Boolean).map(function(value){return formatDate(parseCivilDate(value));})); dates = recurringDates(parseCivilDate(startText),every,unit,count,excluded); } catch (err) { error = err.message; }
      setView('<div class="eyebrow">Recurrence & ICS</div><h1>Generate a finite civil-date series.</h1><p class="lead">Intervals use calendar days, weeks or months from the original anchor. The month-end rule clamps to the last valid day. Results are bounded to 1,000 occurrences.</p><div class="row">' + datePicker('repeat-start','Anchor date',parseCivilDate(startText)) + input('repeat-every','Every N',every,'number') + select('repeat-unit','Interval unit',[['day','Days'],['week','Weeks'],['month','Months']],unit) + input('repeat-count','Occurrences',count,'number') + '</div><div class="row">' + '<div class="field"><label for="repeat-excluded">Excluded dates (comma or line separated)</label><textarea id="repeat-excluded" placeholder="YYYY-MM-DD">' + escapeHTML(excludedText) + '</textarea></div></div><div class="actions">' + button('Generate occurrences','refresh-recurrence',true) + button('Export CSV','export-recurrence') + button('Download ICS','export-recurrence-ics') + '</div>' + (error ? fail(error) : '<div class="notice">' + dates.length + ' occurrence(s) · local date-only events; no remote calendar connection.</div><div class="table-wrap"><table><thead><tr><th>#</th><th>Date</th><th>Weekday</th><th>ISO week</th></tr></thead><tbody>' + dates.map(function (value,index) { const d=parseCivilDate(value); const w=isoWeek(d); return '<tr><td>'+(index+1)+'</td><td>'+value+'</td><td>'+WEEKDAYS[weekday(d)]+'</td><td>'+w.year+'-W'+String(w.week).padStart(2,'0')+'</td></tr>'; }).join('') + '</tbody></table></div>') + '<p><a href="https://make-a-calendar.com/recurring-dates" target="_blank" rel="noopener">Related recurring-date generator</a> · <a href="https://make-a-calendar.com/ical-generator" target="_blank" rel="noopener">ICS calendar generator</a></p>');
    }

    function cron() {
      const expression = view.querySelector('#cron-expression') && view.querySelector('#cron-expression').value || '0 9 * * 1-5';
      const monthText = view.querySelector('#cron-month') && view.querySelector('#cron-month').value || formatDate(utcDate(todayCivil.getUTCFullYear(),todayCivil.getUTCMonth()+1,1)).slice(0,7);
      let days=[];let next=[];let error='';
      try { const parsed=parseCron(expression); const parts=monthText.split('-').map(Number); days=cronMonth(parsed,parts[0],parts[1]); next=cronNext(parsed,new Date(),8,90); } catch (err) { error=err.message; }
      const active = new Set(days.map(function(item){return item.date.slice(-2);}));
      const parsedMonth = monthText.split('-').map(Number); let grid='';
      try { const dates=monthGrid(parsedMonth[0],parsedMonth[1],1); grid='<div class="table-wrap"><table class="calendar"><thead><tr><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th><th>Sun</th></tr></thead><tbody>'; for(let i=0;i<dates.length;i+=7)grid+='<tr>'+dates.slice(i,i+7).map(function(date){const key=String(date.getUTCDate()).padStart(2,'0');return '<td class="'+(active.has(key)&&date.getUTCMonth()+1===parsedMonth[1]?'selected':'')+'">'+(date.getUTCMonth()+1===parsedMonth[1]?key:'')+'</td>';}).join('')+'</tr>'; grid+='</tbody></table></div>'; } catch(_){grid='';}
      setView('<div class="eyebrow">Cron Lab</div><h1>See a five-field schedule on a calendar.</h1><p class="lead">Supports numeric lists, ranges and steps; Sunday is 0 or 7. Month and next-run previews use UTC. This is a preview, not a scheduler.</p><div class="row">' + input('cron-expression','Minute Hour Day-of-month Month Day-of-week',expression,'text') + input('cron-month','UTC month (YYYY-MM)',monthText,'month') + '</div><div class="actions">' + button('Parse and visualize','refresh-cron',true) + '<a class="btn" href="https://make-a-calendar.com/cron-calculator" target="_blank" rel="noopener">Open cron calculator</a> <a class="btn" href="https://make-a-calendar.com/cron-calendar" target="_blank" rel="noopener">Open cron month grid</a></div>' + (error ? fail(error) : '<div class="notice"><code>' + escapeHTML(expression) + '</code> · DOM and DOW both restricted use classic crontab OR semantics.</div><div class="split"><section><h2>UTC run days · ' + escapeHTML(monthText) + '</h2>' + grid + '<div class="help">Highlighted dates match the five cron fields. The day cell does not represent execution success.</div></section><section><h2>Next UTC run instants</h2><div class="table-wrap"><table><tbody>' + next.map(function(value){return '<tr><td><code>'+value+'</code></td></tr>';}).join('') + '</tbody></table></div><p class="help">Search is limited to 90 days to keep browser work bounded. Host timezone and daylight-saving behavior may differ.</p></section></div>'));
    }

    function converters() {
      const kind = view.querySelector('#convert-kind') && view.querySelector('#convert-kind').value || 'civil';
      const raw = view.querySelector('#convert-value') && view.querySelector('#convert-value').value || formatDate(todayCivil);
      let output = null; let error='';
      try { output = convertInput(kind,raw); } catch(err) { error=err.message; }
      const options=[['civil','Civil date'],['ordinal','Gregorian ordinal'],['iso','ISO 8601'],['unix-s','Unix seconds'],['unix-ms','Unix milliseconds'],['unix-us','Unix microseconds'],['unix-ns','Unix nanoseconds'],['excel','Excel serial (1900 system)'],['filetime','Windows FILETIME']];
      setView('<div class="eyebrow">Date Conversion Lab</div><h1>Convert with precision notes.</h1><p class="lead">Date-only input remains a civil date. Timestamp inputs represent UTC instants; Excel serial 60 is retained as its fictitious 1900-02-29 compatibility value.</p><div class="row">' + select('convert-kind','Input format',options,kind) + input('convert-value','Value',raw,'text') + '<div class="actions">' + button('Convert','refresh-converter',true) + button('Copy result','copy-converter') + '</div></div>' + (error ? fail(error) : '<div class="notice"><strong>' + escapeHTML(output.primary) + '</strong></div><div class="table-wrap"><table><tbody>' + output.rows.map(function(row){return '<tr><th>'+escapeHTML(row[0])+'</th><td><code>'+escapeHTML(row[1])+'</code></td></tr>';}).join('') + '</tbody></table></div>') + '<p><a href="https://make-a-calendar.com/converters" target="_blank" rel="noopener">Related converter resources</a> · <a href="https://make-a-calendar.com/excel-date-converter" target="_blank" rel="noopener">Excel date converter</a></p>');
    }

    function planner() {
      const filter = view.querySelector('#planner-filter') && view.querySelector('#planner-filter').value || plannerFilter;
      plannerFilter = filter;
      const editing = state.notes.find(function (item) { return item.id === editingNoteId; }) || null;
      const term=filter.toLowerCase(); const notes=state.notes.filter(function(item){return !term||(item.title+' '+item.date+' '+(item.category||'')).toLowerCase().includes(term);}).sort(function(a,b){return a.date.localeCompare(b.date);});
      setView('<div class="eyebrow">Local Planner</div><h1>Your notes stay in this browser.</h1><p class="lead">The planner uses ChronoStudio local storage only. Back up or export notes before clearing browser data.</p><div class="grid2"><div class="card"><h2>' + (editing ? 'Edit date note' : 'Add a date note') + '</h2><div class="row">' + datePicker('note-date', 'Date', editing ? parseCivilDate(editing.date) : selectedDate) + input('note-title','Note title',editing ? editing.title : '', 'text') + select('note-priority','Priority',[['normal','Normal'],['high','High'],['low','Low']],editing ? editing.priority || 'normal' : 'normal') + '</div><div class="row">' + input('note-category','Category',editing ? editing.category || 'Planning' : 'Planning','text') + '<div class="actions">' + button(editing ? 'Update note' : 'Save note','save-note',true) + (editing ? button('Cancel edit','cancel-note-edit') : '') + '</div></div></div><div class="card"><h2>Search and backup</h2><div class="row">' + input('planner-filter','Filter',filter,'search') + '</div><div class="actions">' + button('Export JSON','export-notes-json') + button('Export CSV','export-notes-csv') + button('Import JSON','import-notes') + button('Clear ChronoStudio data','clear-notes') + '</div><input id="notes-file" type="file" accept="application/json,.json" hidden><p class="help">Imports are limited to 1 MB and validated before use.</p></div></div><h2>' + notes.length + ' note(s)</h2>' + (notes.length ? notes.map(function(item){return '<article class="note"><div><label><input type="checkbox" data-toggle-note="'+escapeHTML(item.id)+'"'+(item.done?' checked':'')+'> Completed</label><strong>'+escapeHTML(item.title)+'</strong><span class="pill">'+escapeHTML(item.priority||'normal')+'</span><p>'+escapeHTML(item.date)+' · '+escapeHTML(item.category||'Planning')+'</p></div><div class="actions"><button type="button" class="btn" data-edit-note="'+escapeHTML(item.id)+'">Edit</button><button type="button" class="btn danger" data-delete-note="'+escapeHTML(item.id)+'">Delete</button></div></article>';}).join('') : '<div class="empty">No matching notes yet.</div>'));
    }

    function printStudio() {
      const year = Number(view.querySelector('#print-year') && view.querySelector('#print-year').value || todayCivil.getUTCFullYear());
      const month = Number(view.querySelector('#print-month') && view.querySelector('#print-month').value || todayCivil.getUTCMonth()+1);
      const weekStart = Number(view.querySelector('#print-week') && view.querySelector('#print-week').value || state.weekStart);
      const layout = view.querySelector('#print-layout') && view.querySelector('#print-layout').value || 'Minimal Editorial';
      const title = view.querySelector('#print-title') && view.querySelector('#print-title').value || (MONTHS[month-1]+' '+year);
      const paper = view.querySelector('#print-paper') && view.querySelector('#print-paper').value || 'A4';
      const orientation = view.querySelector('#print-orientation') && view.querySelector('#print-orientation').value || 'portrait';
      const margin = view.querySelector('#print-margin') && view.querySelector('#print-margin').value || '12';
      const svg = makeCalendarSVG(year,month,weekStart,title,layout);
      setView('<div class="eyebrow">Print & Export</div><h1>Compose a clean calendar page.</h1><p class="lead">Exports are generated locally. Native print opens the browser print dialog; no standalone PDF binary is claimed.</p><div class="row">' + input('print-year','Year',year,'number') + '<div class="field"><label for="print-month">Month</label><select id="print-month">'+monthsSelect+'</select></div>' + select('print-week','Week starts',[['0','Sunday'],['1','Monday']],String(weekStart)) + select('print-layout','Layout',[['Minimal Editorial','Minimal Editorial'],['Corporate Planner','Corporate Planner'],['Academic Planner','Academic Planner'],['Ink Saver','Ink Saver']],layout) + select('print-paper','Paper',[['A4','A4'],['Letter','US Letter']],paper) + select('print-orientation','Orientation',[['portrait','Portrait'],['landscape','Landscape']],orientation) + input('print-margin','Margins (mm)',margin,'number') + input('print-title','Title',title,'text') + '</div><div class="actions">' + button('Refresh preview','refresh-print',true) + button('Download SVG','export-svg') + button('Download standalone HTML','export-html') + button('Print / save as PDF','print-calendar') + '</div><div class="table-wrap" style="padding:12px;max-height:430px"><div id="print-preview">' + svg + '</div></div><p class="help">Four layouts change calendar geometry, color and writing space. Paper size, orientation and margins apply to HTML and native print output.</p><p><a href="https://make-a-calendar.com/pages/blank-calendar" target="_blank" rel="noopener">Related blank calendar templates</a> · <a href="https://make-a-calendar.com/monthly-calendars" target="_blank" rel="noopener">Monthly calendar pages</a></p>');
      const control=view.querySelector('#print-month'); if(control)control.value=String(month);
    }

    function resources() {
      const query=view.querySelector('#resource-search')&&view.querySelector('#resource-search').value||'';const topic=view.querySelector('#resource-topic')&&view.querySelector('#resource-topic').value||'All topics';const mode=view.querySelector('#resource-mode')&&view.querySelector('#resource-mode').value||'all';
      const normalized=query.toLowerCase(); const filtered=RESOURCE_LIST.filter(function(item){return (topic==='All topics'||item.topic===topic)&&(mode==='all'||(mode==='favorites'&&state.favorites.includes(item.url))||(mode==='recent'&&state.recent.includes(item.url)))&&(!normalized||(item.title+' '+item.description+' '+item.tags).toLowerCase().includes(normalized));});
      const recommended=RESOURCE_LIST.find(function(item){return item.url===({calendar:'https://make-a-calendar.com/monthly-calendars',workdays:'https://make-a-calendar.com/business-days-calculator',payroll:'https://make-a-calendar.com/pay-period-calendar',shifts:'https://make-a-calendar.com/shift-calendar',fiscal:'https://make-a-calendar.com/445-calendar',recurrence:'https://make-a-calendar.com/recurring-dates',cron:'https://make-a-calendar.com/cron-calendar',converters:'https://make-a-calendar.com/converters',print:'https://make-a-calendar.com/pages/blank-calendar'}[context.module]||'https://make-a-calendar.com/');});
      setView('<div class="eyebrow">Resource Explorer</div><h1>Find a relevant browser tool.</h1><p class="lead">Search verified Make a Calendar destinations. Links open only after an explicit click; favorites and recent links stay local.</p><div class="row">' + input('resource-search','Search by task',query,'search') + select('resource-topic','Topic',[['All topics','All topics']].concat(Array.from(new Set(RESOURCE_LIST.map(function(item){return item.topic;}))).map(function(item){return [item,item];})),topic) + select('resource-mode','Show',[['all','All verified tools'],['favorites','Favorites'],['recent','Recently opened']],mode) + '</div>' + (recommended?'<div class="notice"><strong>Suggested for this page:</strong> '+escapeHTML(recommended.title)+' — '+escapeHTML(recommended.description)+'</div>':'') + '<div class="actions"><span class="pill">'+state.favorites.length+' favorites</span><span class="pill">'+state.recent.length+' recent</span></div>' + filtered.map(function(item){const favorite=state.favorites.includes(item.url);return '<article class="resource"><div><a href="'+item.url+'" target="_blank" rel="noopener" data-resource-url="'+item.url+'">'+escapeHTML(item.title)+'</a><small>'+escapeHTML(item.description)+' · '+escapeHTML(item.topic)+'</small></div><button type="button" class="btn" data-favorite="'+item.url+'" aria-label="'+(favorite?'Remove':'Add')+' '+escapeHTML(item.title)+' '+(favorite?'from':'to')+' favorites">'+(favorite?'★':'☆')+'</button></article>';}).join('') + (filtered.length?'':'<div class="empty">No resource matches this search.</div>') + '<p class="help">A public link is a useful reference, not a promise of search ranking or traffic.</p>');
    }

    function settings() {
      setView('<div class="eyebrow">Settings & Privacy</div><h1>Choose how the workbench behaves.</h1><p class="lead">Preferences and planning notes are stored under one ChronoStudio-owned local-storage key.</p><div class="card"><div class="row">' + select('setting-week','Calendar week starts',[['0','Sunday'],['1','Monday']],String(state.weekStart)) + '<div class="field"><span class="label">Display</span>' + check('setting-contrast','High-contrast colors',state.highContrast) + '</div><div class="field"><span class="label">Keyboard</span>' + check('setting-shortcut','Enable Ctrl/Cmd + Shift + K command palette',state.shortcutEnabled) + '</div></div><div class="actions">' + button('Save settings','save-settings',true) + '</div></div><div class="grid2">' + card('Stored locally','<p>Saved: date notes, favorites, recently opened resource pages, week-start preference, contrast mode and shortcut preference.</p><p>Not collected: site content, credentials, browsing history or calendar drafts.</p>') + card('Network and page behavior','<p>Core calculations do not use external APIs. The script makes no tracking or telemetry requests and does not modify site controls or drafts.</p><p>Resource links are opened only when clicked.</p>') + '</div><div class="actions">' + button('Download my data','export-notes-json') + button('Clear ChronoStudio data','clear-notes') + '</div><p class="help">Clearing removes only the ChronoStudio local-storage key, after a confirmation prompt.</p>');
    }

    function render() {
      navHTML();
      try {
        if (activeModule === 'dashboard') dashboard();
        else if (activeModule === 'calendar') calendarView();
        else if (activeModule === 'inspector') inspector();
        else if (activeModule === 'workdays') workdays();
        else if (activeModule === 'fiscal') fiscal();
        else if (activeModule === 'payroll') payroll();
        else if (activeModule === 'shifts') shifts();
        else if (activeModule === 'recurrence') recurrence();
        else if (activeModule === 'cron') cron();
        else if (activeModule === 'converters') converters();
        else if (activeModule === 'planner') planner();
        else if (activeModule === 'print') printStudio();
        else if (activeModule === 'resources') resources();
        else settings();
      } catch (error) { setView('<div class="eyebrow">ChronoStudio</div><h1>Check this input.</h1>' + fail(error.message)); }
      if (state.highContrast) panel.classList.add('contrast'); else panel.classList.remove('contrast');
    }

    function open(moduleName) { if (moduleName) activeModule = moduleName; render(); panel.classList.add('open'); panel.setAttribute('aria-hidden','false'); launch.setAttribute('aria-expanded','true'); view.focus(); }
    function closePalette() { commandOverlay.hidden=true; commandButton.focus(); }
    function renderCommandList(query) { const term=String(query||'').toLowerCase(); commandMatches=navItems.filter(function(item){return (item[1]+' '+item[0]).toLowerCase().includes(term);}); commandIndex=Math.min(commandIndex,Math.max(commandMatches.length-1,0)); commandList.innerHTML=commandMatches.map(function(item,index){return '<button type="button" role="option" aria-selected="'+(index===commandIndex?'true':'false')+'" data-command="'+item[0]+'">'+escapeHTML(item[1])+'<span class="pill">Open tool</span></button>';}).join('')||'<div class="empty">No matching tools.</div>'; }
    function showPalette() { if(!panel.classList.contains('open'))open(activeModule); commandOverlay.hidden=false; commandInput.value=''; commandIndex=0; renderCommandList(''); commandInput.focus(); }
    function close() { commandOverlay.hidden=true; panel.classList.remove('open'); panel.setAttribute('aria-hidden','true'); launch.setAttribute('aria-expanded','false'); launch.focus(); }
    function download(name, type, content) { const blob = new Blob([content],{type:type}); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(function(){URL.revokeObjectURL(url);},1000); setStatus('Downloaded ' + name); }
    function selectedCalendarData() { const year=Number(view.querySelector('#cal-year')&&view.querySelector('#cal-year').value||todayCivil.getUTCFullYear()); const month=Number(view.querySelector('#cal-month')&&view.querySelector('#cal-month').value||todayCivil.getUTCMonth()+1); const weekStart=Number(view.querySelector('#cal-week-start')&&view.querySelector('#cal-week-start').value||state.weekStart); return {year:year,month:month,weekStart:weekStart,dates:monthGrid(year,month,weekStart).map(function(date){const w=isoWeek(date);return {date:formatDate(date),day:date.getUTCDate(),weekday:WEEKDAYS[weekday(date)],inMonth:date.getUTCMonth()+1===month,isoYear:w.year,isoWeek:w.week};})}; }
    function selectedRepeatDates() { const start=parseCivilDate(view.querySelector('#repeat-start').value);const excluded=new Set(view.querySelector('#repeat-excluded').value.split(/[\s,]+/).filter(Boolean).map(function(value){return formatDate(parseCivilDate(value));}));return recurringDates(start,view.querySelector('#repeat-every').value,view.querySelector('#repeat-unit').value,view.querySelector('#repeat-count').value,excluded); }

    function runAction(action, element) {
      try {
        if (action === 'close' || action === 'minimize') { close(); return; }
        if (action === 'command-palette') { showPalette(); return; }
        if (action === 'go-calendar') { open('calendar'); return; }
        if (action === 'go-inspector') { open('inspector'); return; }
        if (action === 'go-workdays') { open('workdays'); return; }
        if (action === 'go-resources') { open('resources'); return; }
        if (action === 'refresh-calendar') { state.weekStart=Number(view.querySelector('#cal-week-start').value); saveState(); calendarView(); return; }
        if (action === 'inspect-selected') { open('inspector'); return; }
        if (action === 'inspect-run') { selectedDate=parseCivilDate(view.querySelector('#inspect-date').value); inspector(); return; }
        if (action === 'count-workdays') {
          const start=parseCivilDate(view.querySelector('#work-start').value);const end=parseCivilDate(view.querySelector('#work-end').value);const weekend=[];if(view.querySelector('#weekend-sun').checked)weekend.push(0);if(view.querySelector('#weekend-sat').checked)weekend.push(6);const holidays=view.querySelector('#use-holidays').checked?holidaySetForRange(start,end):null;
          const count=countBusinessDays(start,end,{includeStart:view.querySelector('#include-start').checked,includeEnd:view.querySelector('#include-end').checked,weekendDays:weekend,holidays:holidays});view.querySelector('#work-result').innerHTML='<div class="cards">'+card('Working days','<div class="metric">'+count+'</div><p>counted under the selected rules</p>')+card('Range',escapeHTML(formatDate(start)+' through '+formatDate(end)),'')+card('Assumptions','<p>'+escapeHTML(weekend.map(function(day){return WEEKDAYS[day];}).join(', ')||'No weekend days')+'</p><p>'+(holidays?'US federal observed dates excluded':'No holidays excluded')+'</p>')+'</div>';return;
        }
        if (action === 'add-workdays') { const start=parseCivilDate(view.querySelector('#work-start').value);const offset=Number(view.querySelector('#business-offset').value);if(!Number.isInteger(offset)||Math.abs(offset)>10000)throw new Error('Choose an integer offset from −10,000 to 10,000.');const weekend=[];if(view.querySelector('#weekend-sun').checked)weekend.push(0);if(view.querySelector('#weekend-sat').checked)weekend.push(6);const holidays=view.querySelector('#use-holidays').checked?holidaySetForRange(start,addDays(start,offset*2+30)):null;const result=addBusinessDays(start,offset,{weekendDays:weekend,holidays:holidays});view.querySelector('#work-result').innerHTML='<div class="notice"><strong>'+offset+' business days from '+formatDate(start)+' → '+formatDate(result)+'</strong><br>Start date is not counted as one of the added days.</div>';return; }
        if (action === 'refresh-fiscal') { fiscal(); return; }
        if (action === 'export-fiscal') { const data=fiscalCalendar(Number(view.querySelector('#fiscal-year').value),view.querySelector('#fiscal-pattern').value);download('fiscal-calendar-'+data.year+'.csv','text/csv;charset=utf-8',toCSV([['Quarter','Period','Weeks','First week','Start date','End date']].concat(data.periods.map(function(p){return [p.quarter,p.period,p.weeks,p.firstWeek,p.start,p.end];}))));return; }
        if (action === 'export-fiscal-json') { download('fiscal-calendar.json','application/json',JSON.stringify(fiscalCalendar(Number(view.querySelector('#fiscal-year').value),view.querySelector('#fiscal-pattern').value),null,2));return; }
        if (action === 'refresh-payroll') { payroll(); return; }
        if (action === 'export-payroll') { const body=Array.from(view.querySelectorAll('tbody tr')).map(function(row){return Array.from(row.cells).map(function(cell){return cell.textContent.trim();});});download('payday-schedule.csv','text/csv;charset=utf-8',toCSV([['#','Nominal date','Adjusted date']].concat(body)));return; }
        if (action === 'refresh-shifts') { shifts(); return; }
        if (action === 'export-shifts' || action === 'export-shift-ics') { const rows=Array.from(view.querySelectorAll('#shift-result tbody tr')).map(function(row){return [row.cells[0].textContent,row.cells[1].textContent.trim()];});if(action==='export-shifts')download('shift-rotation.csv','text/csv;charset=utf-8',toCSV([['Date','Shift cycle']].concat(rows)));else {const dates=rows.filter(function(row){return row[1]==='On shift';}).map(function(row){return row[0];});download('shift-on-days.ics','text/calendar;charset=utf-8',makeICS('On shift',dates));}return; }
        if (action === 'refresh-recurrence') { recurrence(); return; }
        if (action === 'export-recurrence' || action === 'export-recurrence-ics') { const dates=selectedRepeatDates();if(action==='export-recurrence')download('recurring-dates.csv','text/csv;charset=utf-8',toCSV([['Date','Weekday','ISO week']].concat(dates.map(function(value){const date=parseCivilDate(value);const w=isoWeek(date);return [value,WEEKDAYS[weekday(date)],w.year+'-W'+String(w.week).padStart(2,'0')];}))));else download('recurring-dates.ics','text/calendar;charset=utf-8',makeICS('ChronoStudio date',dates));return; }
        if (action === 'refresh-cron') { cron(); return; }
        if (action === 'refresh-converter') { converters(); return; }
        if (action === 'refresh-print') { printStudio(); return; }
        if (action === 'copy-converter') { const result=convertInput(view.querySelector('#convert-kind').value,view.querySelector('#convert-value').value);copyText(result.primary+'\n'+result.rows.map(function(row){return row[0]+': '+row[1];}).join('\n'));return; }
        if (action === 'copy-inspection') { selectedDate=parseCivilDate(view.querySelector('#inspect-date').value);const week=isoWeek(selectedDate);copyText(JSON.stringify({date:formatDate(selectedDate),weekday:WEEKDAYS[weekday(selectedDate)],isoWeek:week.week,isoWeekYear:week.year,dayOfYear:dayOfYear(selectedDate),quarter:Math.floor(selectedDate.getUTCMonth()/3)+1,leapYear:leapYear(selectedDate.getUTCFullYear())},null,2));return; }
        if (action === 'note-inspection') { selectedDate=parseCivilDate(view.querySelector('#inspect-date').value);open('planner');return; }
        if (action === 'save-note') { const title=view.querySelector('#note-title').value.trim();if(!title)throw new Error('Enter a short note title.');const date=parseCivilDate(view.querySelector('#note-date').value);const payload={date:formatDate(date),title:title.slice(0,300),category:view.querySelector('#note-category').value.trim().slice(0,80)||'Planning',priority:view.querySelector('#note-priority').value};if(editingNoteId){const existing=state.notes.find(function(item){return item.id===editingNoteId;});if(existing)Object.assign(existing,payload);}else{if(state.notes.length>=2000)throw new Error('The local planner limit is 2,000 notes.');state.notes.push(Object.assign({id:'n-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),done:false},payload));}editingNoteId=null;saveState();planner();setStatus('Note saved locally.');return; }
        if (action === 'export-notes-json') { download('chronostudio-planner.json','application/json',JSON.stringify({schemaVersion:1,exportedAt:new Date().toISOString(),notes:state.notes},null,2));return; }
        if (action === 'export-notes-csv') { download('chronostudio-planner.csv','text/csv;charset=utf-8',toCSV([['Date','Title','Category','Priority','Done']].concat(state.notes.map(function(item){return [item.date,item.title,item.category,item.priority,item.done?'yes':'no'];}))));return; }
        if (action === 'import-notes') { view.querySelector('#notes-file').click();return; }
        if (action === 'clear-notes') { if(window.confirm('Clear only ChronoStudio Pro notes, favorites and preferences from this browser? This cannot be undone.')){window.localStorage.removeItem(STORAGE_KEY);state.notes=[];state.favorites=[];state.recent=[];state.weekStart=0;state.highContrast=false;state.shortcutEnabled=true;render();setStatus('ChronoStudio data cleared.');}return; }
        if (action === 'cancel-note-edit') { editingNoteId=null; planner(); return; }
        if (action === 'save-settings') { state.weekStart=Number(view.querySelector('#setting-week').value);state.highContrast=view.querySelector('#setting-contrast').checked;state.shortcutEnabled=view.querySelector('#setting-shortcut').checked;saveState();render();setStatus('Preferences saved locally.');return; }
        if (action === 'export-svg') { const year=Number(view.querySelector('#cal-year')&&view.querySelector('#cal-year').value||view.querySelector('#print-year')&&view.querySelector('#print-year').value||todayCivil.getUTCFullYear());const month=Number(view.querySelector('#cal-month')&&view.querySelector('#cal-month').value||view.querySelector('#print-month')&&view.querySelector('#print-month').value||todayCivil.getUTCMonth()+1);const weekStart=Number(view.querySelector('#cal-week-start')&&view.querySelector('#cal-week-start').value||view.querySelector('#print-week')&&view.querySelector('#print-week').value||state.weekStart);const title=view.querySelector('#print-title')&&view.querySelector('#print-title').value||MONTHS[month-1]+' '+year;const layout=view.querySelector('#print-layout')&&view.querySelector('#print-layout').value||'Minimal Editorial';download('calendar-'+year+'-'+String(month).padStart(2,'0')+'.svg','image/svg+xml;charset=utf-8',makeCalendarSVG(year,month,weekStart,title,layout));return; }
        if (action === 'export-calendar-csv' || action === 'export-calendar-json') { const data=selectedCalendarData();if(action==='export-calendar-csv')download('calendar-'+data.year+'-'+String(data.month).padStart(2,'0')+'.csv','text/csv;charset=utf-8',toCSV([['Date','Weekday','In month','ISO week-year','ISO week']].concat(data.dates.map(function(item){return [item.date,item.weekday,item.inMonth?'yes':'no',item.isoYear,item.isoWeek];}))));else download('calendar-'+data.year+'-'+String(data.month).padStart(2,'0')+'.json','application/json',JSON.stringify({schemaVersion:1,year:data.year,month:data.month,weekStart:data.weekStart,dates:data.dates},null,2));return; }
        if (action === 'print-calendar') { const year=Number(view.querySelector('#print-year')&&view.querySelector('#print-year').value||view.querySelector('#cal-year')&&view.querySelector('#cal-year').value||todayCivil.getUTCFullYear());const month=Number(view.querySelector('#print-month')&&view.querySelector('#print-month').value||view.querySelector('#cal-month')&&view.querySelector('#cal-month').value||todayCivil.getUTCMonth()+1);const week=Number(view.querySelector('#print-week')&&view.querySelector('#print-week').value||view.querySelector('#cal-week-start')&&view.querySelector('#cal-week-start').value||state.weekStart);const title=view.querySelector('#print-title')&&view.querySelector('#print-title').value||MONTHS[month-1]+' '+year;const layout=view.querySelector('#print-layout')&&view.querySelector('#print-layout').value||'Minimal Editorial';const paper=view.querySelector('#print-paper')&&view.querySelector('#print-paper').value||'Letter';const orientation=view.querySelector('#print-orientation')&&view.querySelector('#print-orientation').value||'portrait';const margin=Number(view.querySelector('#print-margin')&&view.querySelector('#print-margin').value||12);if(!Number.isFinite(margin)||margin<0||margin>40)throw new Error('Print margins must be between 0 and 40 mm.');const svg=makeCalendarSVG(year,month,week,title,layout);const win=window.open('','_blank');if(!win)throw new Error('Allow the browser print window to open, then try again.');win.document.write('<!doctype html><meta charset="utf-8"><title>Calendar '+year+'-'+month+'</title><style>@page{size:'+paper+' '+orientation+';margin:'+margin+'mm}body{margin:0;color:#172b3d;font:14px system-ui,sans-serif}svg{width:100%;height:auto}h1{font-size:1px;color:transparent}</style><h1>Calendar</h1>'+svg+'<script>window.addEventListener("load",function(){window.print()})<\/script>');win.document.close();return; }
        if (action === 'export-html') { const year=Number(view.querySelector('#print-year').value);const month=Number(view.querySelector('#print-month').value);const week=Number(view.querySelector('#print-week').value);const title=view.querySelector('#print-title').value||MONTHS[month-1]+' '+year;const layout=view.querySelector('#print-layout').value;const paper=view.querySelector('#print-paper').value;const orientation=view.querySelector('#print-orientation').value;const margin=Number(view.querySelector('#print-margin').value);if(!Number.isFinite(margin)||margin<0||margin>40)throw new Error('Print margins must be between 0 and 40 mm.');const svg=makeCalendarSVG(year,month,week,title,layout);const html='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>'+escapeHTML(title)+'</title><style>@page{size:'+paper+' '+orientation+';margin:'+margin+'mm}body{margin:0;padding:16px;font:14px system-ui,sans-serif;color:#172b3d}svg{display:block;width:100%;height:auto}.layout-note{color:#567078;font-size:11px}@media print{body{padding:0}}</style><p class="layout-note">'+escapeHTML(layout)+' · Generated locally with ChronoStudio Pro</p>'+svg+'</html>';download('calendar-'+year+'-'+String(month).padStart(2,'0')+'.html','text/html;charset=utf-8',html);return; }
      } catch (error) { setStatus(error.message,true); const region=view.querySelector('.result')||view; const notice=document.createElement('div');notice.className='notice error';notice.setAttribute('role','alert');notice.textContent=error.message;region.prepend(notice); }
    }

    async function copyText(value) { try { await navigator.clipboard.writeText(value); setStatus('Copied to clipboard.'); } catch (_) { setStatus('Clipboard access is unavailable; select and copy the result manually.',true); } }

    nav.addEventListener('click',function(event){const target=event.target.closest('[data-module]');if(!target)return;activeModule=target.dataset.module;render();});
    commandInput.addEventListener('input',function(){commandIndex=0;renderCommandList(commandInput.value);});
    commandInput.addEventListener('keydown',function(event){if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();commandIndex=(commandIndex+(event.key==='ArrowDown'?1:-1)+commandMatches.length)%Math.max(commandMatches.length,1);renderCommandList(commandInput.value);}else if(event.key==='Enter'&&commandMatches[commandIndex]){event.preventDefault();activeModule=commandMatches[commandIndex][0];closePalette();render();view.focus();}else if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closePalette();}});
    shadow.addEventListener('click',function(event){
      const command=event.target.closest('[data-command]');if(command){activeModule=command.dataset.command;closePalette();render();view.focus();return;}
      const moduleButton=event.target.closest('[data-module]');if(moduleButton)return;
      const dateButton=event.target.closest('[data-date]');if(dateButton){try{selectedDate=parseCivilDate(dateButton.dataset.date);setStatus('Selected '+formatDate(selectedDate));calendarView();}catch(error){setStatus(error.message,true);}return;}
      const favorite=event.target.closest('[data-favorite]');if(favorite){const url=favorite.dataset.favorite;state.favorites=state.favorites.includes(url)?state.favorites.filter(function(item){return item!==url;}):state.favorites.concat([url]);saveState();resources();return;}
      const link=event.target.closest('[data-resource-url]');if(link){const url=link.dataset.resourceUrl;state.recent=[url].concat(state.recent.filter(function(item){return item!==url;})).slice(0,12);saveState();return;}
      const noteEdit=event.target.closest('[data-edit-note]');if(noteEdit){editingNoteId=noteEdit.dataset.editNote;planner();return;}
      const noteDelete=event.target.closest('[data-delete-note]');if(noteDelete){if(!window.confirm('Delete this ChronoStudio note? This cannot be undone.'))return;if(editingNoteId===noteDelete.dataset.deleteNote)editingNoteId=null;state.notes=state.notes.filter(function(item){return item.id!==noteDelete.dataset.deleteNote;});saveState();planner();setStatus('Note deleted.');return;}
      const action=event.target.closest('[data-action]');if(action){runAction(action.dataset.action,action);return;}
    });
    shadow.addEventListener('change',function(event){
      if(event.target.id==='notes-file'){
        const file=event.target.files&&event.target.files[0];if(!file)return;if(file.size>1024*1024){setStatus('Import files must be 1 MB or smaller.',true);event.target.value='';return;}
        const reader=new FileReader();reader.onload=function(){try{const parsed=JSON.parse(String(reader.result));if(parsed.schemaVersion!==1||!Array.isArray(parsed.notes)||parsed.notes.length>2000)throw new Error('The file does not match the ChronoStudio backup schema.');const cleaned=parsed.notes.map(function(item){if(!item||typeof item.title!=='string')throw new Error('An imported note has an invalid title.');const date=formatDate(parseCivilDate(item.date));return {id:'n-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),date:date,title:item.title.slice(0,300),category:String(item.category||'Planning').slice(0,80),priority:['low','normal','high'].includes(item.priority)?item.priority:'normal',done:Boolean(item.done)};});state.notes=state.notes.concat(cleaned).slice(0,2000);saveState();planner();setStatus(cleaned.length+' note(s) imported locally.');}catch(error){setStatus(error.message,true);}};reader.readAsText(file);event.target.value='';
      }
    });
    shadow.addEventListener('input',function(event){if(event.target.id==='planner-filter'){plannerFilter=event.target.value;const position=event.target.selectionStart;planner();const next=view.querySelector('#planner-filter');next.focus();next.setSelectionRange(position,position);}else if(event.target.id==='resource-search'){resources();const next=view.querySelector('#resource-search');next.focus();next.setSelectionRange(next.value.length,next.value.length);} });
    shadow.addEventListener('change',function(event){if(event.target.id==='resource-topic'||event.target.id==='resource-mode')resources();if(event.target.dataset.toggleNote){const note=state.notes.find(function(item){return item.id===event.target.dataset.toggleNote;});if(note){note.done=event.target.checked;saveState();setStatus('Note status saved locally.');}}});
    launch.addEventListener('click',function(){if(panel.classList.contains('open'))close();else open(activeModule);});
    panel.querySelector('[data-action="close"]').addEventListener('click',close);
    panel.querySelector('[data-action="minimize"]').addEventListener('click',close);
    document.addEventListener('keydown',function(event){
      if(event.key==='Escape'&&panel.classList.contains('open')){if(!commandOverlay.hidden){closePalette();return;}close();return;}
      if(!state.shortcutEnabled)return;
      const target=event.target;const editing=target&&(/INPUT|TEXTAREA|SELECT/.test(target.tagName)||target.isContentEditable);
      if(!editing&&(event.ctrlKey||event.metaKey)&&event.shiftKey&&event.key.toLowerCase()==='k'){event.preventDefault();showPalette();}
    });
    window.addEventListener('popstate',function(){const next=pageContext(window.location.pathname);if(next.module!==context.module){context=next;activeModule=next.module;panel.querySelector('.brand small').textContent=next.label+' · local-first';render();}});
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})(typeof globalThis !== 'undefined' ? globalThis : this);
