/**
 * Translation registry.
 *
 * This file is the single source of truth for which languages ship with the
 * card. The JSON files are inlined into dist/puffer-card.js at build time, so
 * there is no runtime fetch and no index.json manifest to keep in sync.
 *
 * To add a language:
 *   1. copy src/translations/en.json to src/translations/<lang>.json and
 *      translate the values (keep the keys untouched);
 *   2. add the import and the entry in TRANSLATIONS below;
 *   3. run `npm run build` and commit the regenerated dist/puffer-card.js.
 *
 * `npm run check:translations` verifies that this registry and the contents of
 * src/translations/ agree with each other, and that every language has the
 * same keys as the reference language.
 */

import en from "./translations/en.json";
import it from "./translations/it.json";

/** Language used both as the key reference and as the last-resort fallback. */
export const REFERENCE_LANG = "en";

export const TRANSLATIONS = {
  en,
  it,
};
