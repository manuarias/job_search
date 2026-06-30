const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    globals: true,
    exclude: [
      'pdf-builder/build-cv.test.js', // deprecated — requires markdown-it
      'node_modules/**'
    ]
  }
});
