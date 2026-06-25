#!/usr/bin/env node

/**
 * CV JSON Validator
 *
 * Validates a CV JSON file against schemas/cv.schema.json using ajv.
 * Exits 0 on valid, 1 on invalid.
 *
 * Usage: node scripts/validate-cv.mjs <path/to/cv.json>
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

// ── Resolve schema path relative to this script ──────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = resolve(__dirname, '..', 'schemas', 'cv.schema.json');

// ── Usage ────────────────────────────────────────────────────────────
function usage() {
  console.error('Usage: node scripts/validate-cv.mjs <path/to/cv.json>');
  console.error('');
  console.error('Validates a CV JSON file against schemas/cv.schema.json.');
  console.error('Exits 0 on valid, 1 on invalid.');
  process.exit(1);
}

// ── Main ─────────────────────────────────────────────────────────────
const target = process.argv[2];

if (!target) {
  usage();
}

// Load schema
let schema;
try {
  schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));
} catch (err) {
  console.error(`Failed to read schema at ${SCHEMA_PATH}: ${err.message}`);
  process.exit(1);
}

// Load target JSON
let cvData;
try {
  cvData = JSON.parse(readFileSync(resolve(target), 'utf8'));
} catch (err) {
  console.error(`Failed to read or parse ${target}: ${err.message}`);
  process.exit(1);
}

// Compile and validate
const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);
const validate = ajv.compile(schema);
const valid = validate(cvData);

if (valid) {
  process.exit(0);
} else {
  for (const error of validate.errors) {
    const path = error.instancePath || '(root)';
    const msg = error.message || 'unknown error';
    console.error(`${path}: ${msg}`);
  }
  process.exit(1);
}
