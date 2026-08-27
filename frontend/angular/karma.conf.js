// Karma config: adds a headless, no-sandbox Chrome launcher so unit tests run
// inside Docker containers and CI. Use with `ng test --browsers=ChromeHeadlessNoSandbox`.
//
// karma-chrome-launcher needs a real browser binary path (CHROME_BIN) — it
// doesn't know about Playwright. If the caller hasn't set one, fall back to
// the Chromium Playwright already installed as a devDependency (see
// Dockerfile), resolved dynamically so a Playwright version bump can't leave
// a stale hardcoded path behind. Only used if that binary actually exists on
// disk: CI (GitHub Actions) never runs `playwright install`, and it already
// has a system Chrome that karma-chrome-launcher's own auto-detection finds
// fine — pointing CHROME_BIN at Playwright's (un-downloaded) expected path
// there would break that auto-detection instead of falling back to it.
if (!process.env.CHROME_BIN) {
  try {
    const candidate = require('playwright-core').chromium.executablePath();
    if (require('fs').existsSync(candidate)) {
      process.env.CHROME_BIN = candidate;
    }
  } catch {
    // Not installed (e.g. running on a host machine with system Chrome) —
    // let karma-chrome-launcher fall back to its own auto-detection.
  }
}

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma'),
    ],
    reporters: ['progress'],
    browsers: ['ChromeHeadlessNoSandbox'],
    customLaunchers: {
      ChromeHeadlessNoSandbox: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
      },
    },
    restartOnFileChange: true,
  });
};
