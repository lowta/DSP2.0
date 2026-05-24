import { buildDedupeKey, buildSearchBlob } from './normalizeSearch.js';

const defaultChunkSize = 5000;

export async function dedupeAndIndexRecords(records, { chunkSize = defaultChunkSize, onProgress } = {}) {
  const seen = new Set();
  const unique = [];
  const indexedRows = [];
  let duplicateCount = 0;

  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    const key = buildDedupeKey(record);

    if (seen.has(key)) {
      duplicateCount += 1;
    } else {
      seen.add(key);
      unique.push(record);
      indexedRows.push({
        row: record,
        searchBlob: buildSearchBlob(record),
      });
    }

    if (index > 0 && index % chunkSize === 0) {
      onProgress?.({ processed: index, total: records.length, unique: unique.length });
      await yieldToBrowser();
    }
  }

  onProgress?.({ processed: records.length, total: records.length, unique: unique.length });

  return { unique, indexedRows, duplicateCount };
}

function yieldToBrowser() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}
