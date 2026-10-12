# Contributing

Keep calculations timezone-independent when they accept civil dates. Add a regression case for each boundary or behavior change. Do not add remote executable code, tracking, broad site matches, or links that are unrelated to the tool being described.

Before opening a pull request, run `npm run verify`. Changes to the userscript must keep `src/chronostudio.user.js` and the generated `dist/chronostudio.user.js` in sync; the build copies the readable source without minification. Update the guide, README and changelog when behavior or limitations change.

For date math, prefer explicit `YYYY-MM-DD` strings and UTC civil arithmetic. For any algorithm with a policy choice, document the assumption in both the interface and tests. Do not describe a planning estimate as legal, payroll or compliance advice.
