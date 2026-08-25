#!/usr/bin/env node
/**
 * Validates the translation files under src/translations/.
 *
 * Checks:
 * 1. Registry consistency — every language imported in src/i18n.js has a
 *    matching src/translations/<lang>.json file, and every file in that folder
 *    is registered in src/i18n.js (no orphans in either direction).
 * 2. Key completeness — every key present in en.json (the reference language)
 *    exists in every other language file, with no unused extra keys. Missing
 *    keys are not fatal (the card falls back to English at runtime) but are
 *    reported so contributors can spot incomplete translations before opening
 *    a PR.
 * 3. Bundle contents — if dist/puffer-card.js exists, a sample string from
 *    every language must actually be present inside it. This is the check that
 *    guards the single-file release: translations are no longer fetched at
 *    runtime, so if they are not in the bundle they do not exist at all.
 *
 * Run `npm run build` first so that check 3 has something to inspect;
 * `npm run check` does both in order.
 *
 * Usage: node scripts/check-translations.js
 * Exit code: 0 if OK (warnings allowed), 1 if a structural error is found
 * (missing file, invalid JSON, registry out of sync, or a language missing
 * from the built bundle).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const TRANSLATIONS_DIR = path.join(ROOT, "src", "translations");
const I18N_PATH = path.join(ROOT, "src", "i18n.js");
const BUNDLE_PATH = path.join(ROOT, "dist", "puffer-card.js");
const REFERENCE_LANG = "en";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

/**
 * Extracts the language codes registered in src/i18n.js by reading its
 * `import <lang> from "./translations/<lang>.json";` lines.
 */
function readRegistry() {
  const source = fs.readFileSync(I18N_PATH, "utf8");
  const re = /import\s+\w+\s+from\s+["']\.\/translations\/([\w-]+)\.json["']/g;
  const langs = [];
  let m;
  while ((m = re.exec(source)) !== null) langs.push(m[1]);
  return langs;
}

/** Picks a distinctive value from a dictionary to grep for in the bundle. */
function sampleValue(dict) {
  const values = Object.values(dict).filter(
    (v) => typeof v === "string" && v.length >= 4
  );
  // Longest value: least likely to collide with unrelated bundle content.
  return values.sort((a, b) => b.length - a.length)[0] || null;
}

function main() {
  let hasError = false;
  let hasWarning = false;

  if (!fs.existsSync(TRANSLATIONS_DIR)) {
    console.error(`Missing ${TRANSLATIONS_DIR}`);
    process.exit(1);
  }
  if (!fs.existsSync(I18N_PATH)) {
    console.error(`Missing ${I18N_PATH}`);
    process.exit(1);
  }

  /* -- 1. registry consistency -------------------------------------------- */

  const registeredLangs = readRegistry();
  if (registeredLangs.length === 0) {
    console.error("src/i18n.js does not import any translation file");
    process.exit(1);
  }

  const filesOnDisk = fs
    .readdirSync(TRANSLATIONS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""));

  for (const lang of registeredLangs) {
    if (!filesOnDisk.includes(lang)) {
      console.error(`src/i18n.js imports "${lang}" but ${lang}.json is missing`);
      hasError = true;
    }
  }
  for (const lang of filesOnDisk) {
    if (!registeredLangs.includes(lang)) {
      console.error(
        `${lang}.json exists but is not imported in src/i18n.js — it would not ship in the bundle`
      );
      hasError = true;
    }
  }

  if (!filesOnDisk.includes(REFERENCE_LANG)) {
    console.error(`Reference language "${REFERENCE_LANG}.json" not found`);
    process.exit(1);
  }

  /* -- 2. key completeness ------------------------------------------------ */

  const dicts = {};
  for (const lang of filesOnDisk) {
    try {
      dicts[lang] = readJson(path.join(TRANSLATIONS_DIR, `${lang}.json`));
    } catch (err) {
      console.error(`${lang}.json is not valid JSON: ${err.message}`);
      hasError = true;
    }
  }

  if (!dicts[REFERENCE_LANG]) {
    console.error(`Reference language "${REFERENCE_LANG}.json" could not be parsed`);
    process.exit(1);
  }

  const referenceKeys = new Set(Object.keys(dicts[REFERENCE_LANG]));

  for (const lang of filesOnDisk) {
    if (lang === REFERENCE_LANG || !dicts[lang]) continue;
    const dictKeys = new Set(Object.keys(dicts[lang]));
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
  console.log(`[${REFERENCE_LANG}] reference — ${referenceKeys.size} keys`);

  /* -- 3. bundle contents ------------------------------------------------- */

  if (!fs.existsSync(BUNDLE_PATH)) {
    console.warn(
      "\ndist/puffer-card.js not found — skipping bundle check. Run `npm run build` first."
    );
    hasWarning = true;
  } else {
    const bundle = fs.readFileSync(BUNDLE_PATH, "utf8");
    for (const lang of filesOnDisk) {
      if (!dicts[lang]) continue;
      const sample = sampleValue(dicts[lang]);
      if (!sample) {
        console.warn(`[${lang}] no sample string long enough to check in the bundle`);
        hasWarning = true;
        continue;
      }
      if (bundle.includes(sample)) {
        console.log(`[${lang}] present in dist/puffer-card.js`);
      } else {
        console.error(
          `[${lang}] NOT found in dist/puffer-card.js (looked for ${JSON.stringify(sample)}) — ` +
            "the bundle is stale, or the language is not registered in src/i18n.js"
        );
        hasError = true;
      }
    }
  }

  /* -- verdict ------------------------------------------------------------ */

  if (hasError) {
    console.error("\nTranslation check FAILED (structural error).");
    process.exit(1);
  }
  if (hasWarning) {
    console.warn("\nTranslation check completed with warnings (see above).");
  } else {
    console.log("\nAll translation files are complete, registered and bundled.");
  }
}

main();
