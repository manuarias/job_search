#!/usr/bin/env node

/**
 * scripts/sync-data.js — Deep-merge template fields into user data files.
 *
 * Finds all .template files in data/, resumes/, applications/ and compares them
 * against the corresponding user data files (filename without .template suffix).
 *
 * Usage:
 *   node scripts/sync-data.js           — merge new fields
 *   node scripts/sync-data.js --dry-run — report changes without writing
 */

const fs = require('fs');
const path = require('path');

const TEMPLATE_DIRS = ['data', 'resumes', 'applications'];
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DRY_RUN = process.argv.includes('--dry-run');

let errorCount = 0;
let changeCount = 0;

// ── Helpers ──────────────────────────────────────────────────────────

function isPlainObject(val) {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

/**
 * Deep-clone a value (only plain objects and arrays; primitives returned as-is).
 */
function clone(val) {
  if (Array.isArray(val)) return val.map(clone);
  if (isPlainObject(val)) {
    const copy = {};
    for (const key of Object.keys(val)) {
      copy[key] = clone(val[key]);
    }
    return copy;
  }
  return val;
}

/**
 * Recursively compare template object against userData object.
 * Returns list of dot-notation paths for keys that exist in template but not in userData.
 * Does NOT mutate — the caller decides whether to apply changes.
 */
function findNewFields(template, userData, prefix = '') {
  const added = [];
  for (const key of Object.keys(template)) {
    const tplVal = template[key];
    const fullPath = prefix ? `${prefix}.${key}` : key;
    if (!(key in userData)) {
      added.push({ path: fullPath, value: clone(tplVal) });
    } else if (isPlainObject(tplVal) && isPlainObject(userData[key])) {
      added.push(...findNewFields(tplVal, userData[key], fullPath));
    }
  }
  return added;
}

/**
 * Apply found fields into userData (mutates).
 */
function applyFields(userData, newFields) {
  for (const { path: fieldPath, value } of newFields) {
    const keys = fieldPath.split('.');
    let target = userData;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in target)) target[keys[i]] = {};
      target = target[keys[i]];
    }
    target[keys[keys.length - 1]] = clone(value);
  }
}

// ── Per-file processing ──────────────────────────────────────────────

function processJson(templatePath, userPath) {
  if (!fs.existsSync(userPath)) {
    console.error(`❌ ${path.relative(PROJECT_ROOT, userPath)}: user file missing (copy the template first)`);
    errorCount++;
    return;
  }

  let template, userData;
  try {
    template = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));
  } catch (e) {
    console.error(`❌ ${path.relative(PROJECT_ROOT, templatePath)}: invalid template JSON — ${e.message}`);
    errorCount++;
    return;
  }
  try {
    userData = JSON.parse(fs.readFileSync(userPath, 'utf-8'));
  } catch (e) {
    console.error(`❌ ${path.relative(PROJECT_ROOT, userPath)}: invalid user JSON — ${e.message}`);
    errorCount++;
    return;
  }

  const newFields = findNewFields(template, userData);

  if (newFields.length === 0) {
    console.log(`✅ ${path.relative(PROJECT_ROOT, userPath)}: up to date`);
    return;
  }

  const relPath = path.relative(PROJECT_ROOT, userPath);
  console.log(`⚠️  ${relPath}: ${newFields.length} new field(s) detected`);

  for (const { path: fieldPath, value } of newFields) {
    const preview = typeof value === 'string' && value.length > 60
      ? value.substring(0, 57) + '...'
      : typeof value === 'string' ? value : JSON.stringify(value);
    console.log(`   + ${fieldPath} (${preview})`);
  }

  if (!DRY_RUN) {
    applyFields(userData, newFields);
    fs.writeFileSync(userPath, JSON.stringify(userData, null, 2) + '\n');
    console.log(`   → merged into ${relPath}`);
  }

  changeCount += newFields.length;
}

function processMarkdown(templatePath, userPath) {
  if (!fs.existsSync(userPath)) {
    console.error(`❌ ${path.relative(PROJECT_ROOT, userPath)}: user file missing (copy the template first)`);
    errorCount++;
    return;
  }

  const relPath = path.relative(PROJECT_ROOT, userPath);
  try {
    const templateStat = fs.statSync(templatePath);
    const userStat = fs.statSync(userPath);

    if (templateStat.mtimeMs > userStat.mtimeMs) {
      const tplDate = templateStat.mtime.toISOString().substring(0, 10);
      const usrDate = userStat.mtime.toISOString().substring(0, 10);
      console.log(`⚠️  ${relPath}: template is newer (${tplDate} > ${usrDate}) — review manually`);
      changeCount++;
    } else {
      console.log(`✅ ${relPath}: up to date`);
    }
  } catch (e) {
    console.error(`❌ ${relPath}: could not read file stats — ${e.message}`);
    errorCount++;
  }
}

// ── Discovery ────────────────────────────────────────────────────────

function findTemplateFiles() {
  const templates = [];

  for (const dir of TEMPLATE_DIRS) {
    const dirPath = path.join(PROJECT_ROOT, dir);
    if (!fs.existsSync(dirPath)) continue;

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.template')) {
        const templatePath = path.join(dirPath, entry.name);
        // User file is template with .template suffix removed
        const userPath = templatePath.replace(/\.template$/, '');
        templates.push({ templatePath, userPath });
      }
    }
  }

  return templates;
}

// ── Main ─────────────────────────────────────────────────────────────

function main() {
  if (DRY_RUN) {
    console.log('[DRY RUN] — reporting changes without writing\n');
  }

  const templates = findTemplateFiles();

  if (templates.length === 0) {
    console.log('No .template files found.');
    process.exit(0);
  }

  for (const { templatePath, userPath } of templates) {
    const ext = path.extname(userPath).toLowerCase();
    if (ext === '.json') {
      processJson(templatePath, userPath);
    } else if (ext === '.md') {
      processMarkdown(templatePath, userPath);
    } else {
      console.error(`❌ ${path.relative(PROJECT_ROOT, userPath)}: unsupported file type (${ext})`);
      errorCount++;
    }
  }

  console.log();

  if (errorCount > 0) {
    console.log(`Done — ${changeCount} change(s) needed, ${errorCount} error(s).`);
    process.exit(1);
  }

  if (changeCount === 0) {
    console.log('No changes needed.');
  } else if (DRY_RUN) {
    console.log(`Done — ${changeCount} change(s) would be made. Run without --dry-run to apply.`);
  } else {
    console.log(`Done — ${changeCount} change(s) applied.`);
  }

  process.exit(0);
}

main();
