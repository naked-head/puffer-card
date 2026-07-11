#!/usr/bin/env node
/**
 * Validates the translation files under dist/translations/.
 *
 * Checks:
 * 1. Every language listed in index.json has a corresponding <lang>.json file.
 * 2. Every <lang>.json file listed in index.json exists in index.json (no orphans).
 * 3. Every key present in en.json (the reference language) exists in every
 *    other language file. Missing keys are not fatal — the card falls back
 *    to English at runtime — but they are reported so contributors can spot
 *    incomplete translations before opening a PR.
 *
 * Usage: node scripts/check-translations.js
 * Exit code: 0 if OK (warnings allowed), 1 if a structural error is found
 * (missing file, invalid JSON, or index.json out of sync with the folder).
 */

const fs = require("fs");
const path = require("path");

const TRANSLATIONS_DIR = path.join(__dirname, "..", "dist", "translations");
const INDEX_PATH = path.join(TRANSLATIONS_DIR, "index.json");
const REFERENCE_LANG = "en";

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function main() {
  let hasError = false;
  let hasWarning = false;

  if (!fs.existsSync(INDEX_PATH)) {
    console.error(`Missing ${INDEX_PATH}`);
    process.exit(1);
  }
  const index = readJson(INDEX_PATH);
  const declaredLangs = Object.keys(index);

  // Every declared language must have a matching file.
  for (const lang of declaredLangs) {
    const filePath = path.join(TRANSLATIONS_DIR, `${lang}.json`);
    if (!fs.existsSync(filePath)) {
      console.error(`index.json declares "${lang}" but ${lang}.json is missing`);
      hasError = true;
    }
  }

  // Every .json file in the folder (except index.json) should be declared.
  const filesOnDisk = fs
    .readdirSync(TRANSLATIONS_DIR)
    .filter((f) => f.endsWith(".json") && f !== "index.json")
    .map((f) => f.replace(/\.json$/, ""));
  for (const lang of filesOnDisk) {
    if (!declaredLangs.includes(lang)) {
      console.error(`${lang}.json exists but is not declared in index.json`);
      hasError = true;
    }
  }

  if (!filesOnDisk.includes(REFERENCE_LANG)) {
    console.error(`Reference language "${REFERENCE_LANG}.json" not found`);
    process.exit(1);
  }

  const reference = readJson(path.join(TRANSLATIONS_DIR, `${REFERENCE_LANG}.json`));
  const referenceKeys = new Set(Object.keys(reference));

  for (const lang of filesOnDisk) {
    if (lang === REFERENCE_LANG) continue;
    const filePath = path.join(TRANSLATIONS_DIR, `${lang}.json`);
    let dict;
    try {
      dict = readJson(filePath);
    } catch (err) {
      console.error(`${lang}.json is not valid JSON: ${err.message}`);
      hasError = true;
      continue;
    }
    const dictKeys = new Set(Object.keys(dict));
    const missing = [...referenceKeys].filter((k) => !dictKeys.has(k));
    const extra = [...dictKeys].filter((k) => !referenceKeys.has(k));

    if (missing.length > 0) {
      console.warn(`[${lang}] missing ${missing.length} key(s): ${missing.join(", ")}`);
      hasWarning = true;
    }
    if (extra.length > 0) {
      console.warn(`[${lang}] has ${extra.length} unused key(s) not in en.json: ${extra.join(", ")}`);
      hasWarning = true;
    }
    if (missing.length === 0 && extra.length === 0) {
      console.log(`[${lang}] OK — ${dictKeys.size} keys, matches en.json`);
    }
  }

  if (hasError) {
    console.error("\nTranslation check FAILED (structural error).");
    process.exit(1);
  }
  if (hasWarning) {
    console.warn("\nTranslation check completed with warnings (see above).");
  } else {
    console.log("\nAll translation files are complete and in sync.");
  }
}

main();
