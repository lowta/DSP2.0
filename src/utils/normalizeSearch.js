export function namesToApiFilter(rawValue) {
  return rawValue
    .split(/[\n,;|]+/)
    .map((name) => name.trim())
    .filter(Boolean)
    .join('|');
}

export function normalizeForLocalSearch(value) {
  return String(value ?? '')
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildDedupeKey(record) {
  const name = normalizeForLocalSearch(record?.Holder_Name);
  const address = normalizeForLocalSearch(record?.Detail_Address);

  return name && address ? `${name}|${address}` : JSON.stringify(record);
}

export function buildSearchBlob(record) {
  return normalizeForLocalSearch(
    [
      record.Tracking_id,
      record.Holder_Name,
      record.Receiver_Phone,
      record.Detail_Address,
      record.City,
      record.Province,
    ].join(' '),
  );
}

export function buildFutureNameVariants(name) {
  return [name.trim()].filter(Boolean);
}
