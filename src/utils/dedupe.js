import { buildDedupeKey } from './normalizeSearch.js';

export function dedupeByNameAndAddress(records) {
  const seen = new Set();
  const unique = [];
  let duplicateCount = 0;

  for (const record of records) {
    const key = buildDedupeKey(record);

    if (seen.has(key)) {
      duplicateCount += 1;
      continue;
    }

    seen.add(key);
    unique.push(record);
  }

  return { unique, duplicateCount };
}
