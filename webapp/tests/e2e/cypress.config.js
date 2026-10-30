const { defineConfig } = require("cypress");

// Defaults match the Docker stack opened from the host; the compose "e2e-tests" service overrides
// them with the in-network addresses (CYPRESS_BASE_URL, MAILPIT_URL).
module.exports = defineConfig({
  env: {
    USERTEST_USERNAME: process.env.TEST_USER_USERNAME,
    USERTEST_PASSWORD: process.env.TEST_USER_PASSWORD,
    MAILPIT_URL: process.env.MAILPIT_URL || 'http://localhost:8025',
  },
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'tests/e2e/cypress/support/e2e.js',
    specPattern: 'tests/e2e/cypress/e2e/*.cy.js',
    // inside the folder the e2e-tests service mounts, so failure screenshots reach the host
    screenshotsFolder: 'tests/e2e/cypress/screenshots',
    video: false,
  },
});
