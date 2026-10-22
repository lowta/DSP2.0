import {test} from 'node:test';
import assert from 'node:assert/strict';
import {encryptContacts,decryptContacts} from '../src/services/contactCrypto.js';
import {loadContacts} from '../src/services/contactStore.js';
import {combinedSearch,mergeSources,matchContacts} from '../src/services/combinedSearch.js';
const row={Holder_Name:'José Pérez',Receiver_Phone:'0012345',Detail_Address:'Calle 1',City:'Madrid',Province:'',Description:''};
const token='test-only-token-not-a-real-credential';
test('encrypted round trip preserves phone, random salt/IV and rejects wrong key/tampering',async()=>{
 const a=await encryptContacts([row],token),b=await encryptContacts([row],token);
 assert.notEqual(a.ciphertext,b.ciphertext);assert.ok(!JSON.stringify(a).includes('Pérez'));
 assert.deepEqual((await decryptContacts(a,token)).contacts,[row]);
 await assert.rejects(decryptContacts(a,'wrong'),/Token incorrecto/);
 await assert.rejects(decryptContacts({...a,ciphertext:'AAAA'+a.ciphertext.slice(4)},token));
});
test('name queries match accents and multiple names',()=>{assert.equal(matchContacts([row],'otro; jose').length,1);assert.equal(matchContacts([row],'ana').length,0);});
test('merge preserves distinct phones and marks shared source',()=>{const rows=mergeSources([row],[row,{...row,Receiver_Phone:'999'}]);assert.equal(rows.length,2);assert.equal(rows[0].Source,'API + Local');});
test('API empty or failing still returns local matches; local failure still returns API',async()=>{
 for(const api of [async()=>({results:[]}),async()=>{throw Error('offline');}]) {const r=await combinedSearch({api,local:async()=>({contacts:[row]}),query:'jose'});assert.equal(r.results[0].Source,'Local');}
 const result=await combinedSearch({api:async()=>({results:[row]}),local:async()=>{throw Error('bad token');},query:'jose'});assert.equal(result.results[0].Source,'API');assert.equal(result.warnings.length,1);
});
test('encrypted cache works offline and corrupt remote does not replace valid cache',async()=>{
 const storage=new Map();storage.setItem=storage.set.bind(storage);storage.getItem=storage.get.bind(storage);
 const envelope=await encryptContacts([row],token);const options={url:'https://example.test/list',token,storage};
 await loadContacts({...options,fetcher:async()=>new Response(JSON.stringify(envelope))});
 const cached=await loadContacts({...options,fetcher:async()=>{throw Error('offline');}});assert.equal(cached.cached,true);assert.equal(cached.contacts.length,1);
 await assert.rejects(loadContacts({...options,fetcher:async()=>new Response('{"version":9}')}));
 assert.equal(storage.get(`dsp2:encrypted-contacts:${options.url}`),JSON.stringify(envelope));
 await assert.rejects(loadContacts({...options,allowCache:false,fetcher:async()=>{throw Error('offline');}}));
});

test('description survives encryption and local note wins when merging',async()=>{
 const annotated={...row,Description:'23/10/2026 — teléfono confirmado'};
 const decoded=await decryptContacts(await encryptContacts([annotated],token),token);
 assert.equal(decoded.contacts[0].Description,annotated.Description);
 assert.equal(mergeSources([row],decoded.contacts)[0].Description,annotated.Description);
});
test('old contacts without description remain readable',async()=>{
 const {Description,...legacy}=row;
 const decoded=await decryptContacts(await encryptContacts([legacy],token),token);
 assert.equal(decoded.contacts[0].Description,'');
});
test('detail cells expose full escaped text and correct virtual row index',async()=>{
 const {renderRow}=await import('../src/ui/virtualTable.js');
 const html=renderRow({...row,Detail_Address:'Calle <larga> & más',Description:'23/10/2026'},42);
 assert.match(html,/data-row="42"/);
 assert.match(html,/Calle &lt;larga&gt; &amp; más/);
 assert.match(html,/data-detail="Description"/);
 assert.ok(!html.includes('<larga>'));
});

test('same name and phone with changed address retains local description in one row',()=>{
 const own={...row,Detail_Address:'Dirección actualizada',Description:'actualizado hoy'};
 const merged=mergeSources([row,row],[own]);
 assert.equal(merged.length,1);assert.equal(merged[0].Description,'actualizado hoy');
 assert.equal(merged[0].Detail_Address,own.Detail_Address);
});
test('ambiguous address matches are not silently collapsed',()=>{
 const remote=[row,{...row,Detail_Address:'Otro domicilio'}];
 const own={...row,Detail_Address:'Tercer domicilio',Description:'nota'};
 assert.equal(mergeSources(remote,[own]).length,3);
 assert.equal(mergeSources([row],[{...own,Receiver_Phone:'999'}]).length,2);
});
