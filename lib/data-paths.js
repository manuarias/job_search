/**
 * Data Path Resolution Module
 *
 * Centralizes data directory resolution for the job_search pipeline.
 * All lib modules and scripts that need to read structured data files
 * (CV JSON, tracking JSON, keyword taxonomies, configs) MUST use
 * getDataDir() instead of hardcoding paths.
 *
 * CJS module — consumed via require('./lib/data-paths').
 *
 * Usage:
 *   const { getDataDir } = require('./lib/data-paths');
 *   const cvPath = path.join(getDataDir(), 'cv_en.json');
 */

'use strict';

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');

/**
 * Resolve the data directory.
 *
 * Reads the JS_DATA_DIR environment variable. When set to a non-empty
 * string, the value is resolved (absolute paths used as-is, relative
 * paths resolved against PROJECT_ROOT). When the resolved directory
 * does NOT exist, the process exits with a clear error message.
 *
 * When JS_DATA_DIR is unset or empty, falls back to PROJECT_ROOT/data.
 *
 * @returns {string} Absolute path to the data directory.
 */
function getDataDir() {
  const envDir = process.env.JS_DATA_DIR;

  // Unset or empty string → fallback to default data/ directory
  if (envDir === undefined || envDir === '') {
    return path.join(PROJECT_ROOT, 'data');
  }

  // Resolve relative paths against PROJECT_ROOT
  const resolved = path.isAbsolute(envDir)
    ? envDir
    : path.resolve(PROJECT_ROOT, envDir);

  // Validate: explicitly set but directory does not exist
  if (!fs.existsSync(resolved)) {
    throw new Error(`JS_DATA_DIR is set to "${envDir}" but the directory does not exist: ${resolved}`);
  }

  return resolved;
}

/**
 * Resolve the applications directory.
 *
 * Always returns PROJECT_ROOT/applications — this directory is not
 * affected by JS_DATA_DIR because it lives alongside the repo, not
 * inside the data directory.
 *
 * @returns {string} Absolute path to the applications directory.
 */
function getApplicationsDir() {
  return path.join(PROJECT_ROOT, 'applications');
}

module.exports = { getDataDir, getApplicationsDir };
