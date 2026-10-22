import { normalizeForLocalSearch, namesToApiFilter } from '../utils/normalizeSearch.js';
export function contactKey(row) { return `${normalizeForLocalSearch(row.Holder_Name)}|${String(row.Receiver_Phone||'').replace(/[^0-9]/g,'')}|${normalizeForLocalSearch(row.Detail_Address)}`; }
export function matchContacts(rows, query) {
  const names=namesToApiFilter(query).split('|').map(normalizeForLocalSearch).filter(Boolean);
  return rows.filter(row=>names.some(name=>normalizeForLocalSearch(row.Holder_Name).includes(name)));
}
function personKey(row) {
  const name = normalizeForLocalSearch(row.Holder_Name);
  const phone = String(row.Receiver_Phone || '').replace(/[^0-9]/g, '');
  return name && phone ? name + '|' + phone : null;
}
export function mergeSources(apiRows, localRows) {
  const map = new Map();
  for (const row of apiRows) {
    const key = contactKey(row);
    if (!map.has(key)) map.set(key, {...row, Source: 'API'});
  }
  const candidates = new Map();
  for (const row of map.values()) {
    const key = personKey(row);
    if (key) candidates.set(key, [...(candidates.get(key) || []), row]);
  }
  const localCounts = new Map();
  for (const row of localRows) {
    const key = personKey(row);
    if (key) localCounts.set(key, (localCounts.get(key) || 0) + 1);
  }
  for (const row of localRows) {
    const key = contactKey(row), person = personKey(row);
    const matches = candidates.get(person) || [];
    // Match changed addresses only when name + phone identify one row on each side.
    const previous = map.get(key) || (matches.length === 1 && localCounts.get(person) === 1 ? matches[0] : null);
    if (previous) {
      if (previous.Source === 'API' || previous.Source === 'API + Local') {
        for (const field of ['Detail_Address', 'City', 'Province']) if (row[field]) previous[field] = row[field];
        previous.Description = row.Description || '';
        previous.Source = 'API + Local';
      } else if (row.Description) previous.Description = row.Description;
    } else map.set(key, {...row, Source: 'Local'});
  }
  return [...map.values()];
}
export async function combinedSearch({api,local,query}) {
  const [remote,own]=await Promise.allSettled([api(),local()]);
  const warnings=[];
  if(remote.status==='rejected') warnings.push('API no disponible.');
  if(own.status==='rejected') warnings.push(own.reason.message || 'Contactos propios no disponibles.');
  if(remote.status==='rejected' && own.status==='rejected') throw Error(warnings.join(' '));
  const a=remote.status==='fulfilled'?remote.value.results:[];
  const b=own.status==='fulfilled'?matchContacts(own.value.contacts,query):[];
  if(own.status==='fulfilled' && own.value.warning) warnings.push(own.value.warning);
  const results=mergeSources(a,b);
  return {results,warnings,duplicateCount:a.length+b.length-results.length};
}
