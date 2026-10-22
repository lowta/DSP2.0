import { normalizeForLocalSearch, namesToApiFilter } from '../utils/normalizeSearch.js';
export function contactKey(row) { return `${normalizeForLocalSearch(row.Holder_Name)}|${String(row.Receiver_Phone||'').replace(/[^0-9]/g,'')}|${normalizeForLocalSearch(row.Detail_Address)}`; }
export function matchContacts(rows, query) {
  const names=namesToApiFilter(query).split('|').map(normalizeForLocalSearch).filter(Boolean);
  return rows.filter(row=>names.some(name=>normalizeForLocalSearch(row.Holder_Name).includes(name)));
}
export function mergeSources(apiRows, localRows) {
  const map=new Map();
  for(const [rows,source] of [[apiRows,'API'],[localRows,'Local']]) for(const row of rows) {
    const k=contactKey(row); const previous=map.get(k);
    if(previous) { if(source==='Local' && row.Description) previous.Description=row.Description; if(previous.Source!==source) previous.Source='API + Local'; }
    else map.set(k,{...row,Source:source});
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
