# Security policy

The userscript runs on `https://make-a-calendar.com/*` and uses no privileged userscript grants. It performs calculations locally and does not load remote executable code or send planner content anywhere.

Please report suspected security issues privately to the repository owner before publishing exploit details. Include the affected version and a minimal reproduction. Do not include credentials or private calendar data in an issue.

Imported JSON is size-limited and schema-checked. User-provided text is rendered as escaped text; it is never evaluated as code. The userscript does not use `eval`, `new Function`, or `innerHTML` with unescaped user content.
