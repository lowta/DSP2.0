import { decryptContacts } from './contactCrypto.js';
export async function loadContacts({url,token,storage=localStorage,fetcher=fetch,allowCache=true}) {
  const cacheKey=`dsp2:encrypted-contacts:${url}`;
  let envelope;
  try {
    const response=await fetcher(url,{cache:'no-store',signal:AbortSignal.timeout(12000)});
    if(!response.ok) throw Error(`HTTP ${response.status}`);
    const raw=await response.text();
    if(raw.length>20000000) throw Error('Archivo demasiado grande.');
    envelope=JSON.parse(raw);
  } catch(error) {
    if(!allowCache) throw Error('No se pudo descargar la lista. Importá una copia cifrada o reintentá.');
    let cached; try { cached=storage.getItem(cacheKey); } catch {}
    if(!cached) throw Error('Contactos propios no disponibles.');
    const result=await decryptContacts(JSON.parse(cached),token);
    return {...result,cached:true,warning:'Sin sincronizar: usando la última copia descargada.'};
  }
  // A wrong token or invalid remote file must never replace the last valid cache.
  const result=await decryptContacts(envelope,token);
  let warning=''; try { storage.setItem(cacheKey,JSON.stringify(envelope)); } catch { warning='Actualizados, pero no se pudo guardar la copia sin conexión.'; }
  return {...result,cached:false,warning};
}
