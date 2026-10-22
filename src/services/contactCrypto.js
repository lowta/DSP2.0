const encoder = new TextEncoder();
const iterations = 600000;
const aad = encoder.encode('DSP2-private-contacts-v1');
const fields = ['Holder_Name', 'Receiver_Phone', 'Detail_Address', 'City', 'Province'];
function base64(bytes) { let text = ''; for (const byte of bytes) text += String.fromCharCode(byte); return btoa(text); }
function bytes(text) { return Uint8Array.from(atob(text), c => c.charCodeAt(0)); }
export function validateContacts(records) {
  if (!Array.isArray(records) || records.length > 50000) throw Error('Lista de contactos inválida.');
  return records.map(record => {
    if (!record || typeof record !== 'object') throw Error('Contacto inválido.');
    const clean = {};
    for (const field of fields) {
      if (record[field] != null && typeof record[field] !== 'string') throw Error('Los campos deben ser texto.');
      clean[field] = (record[field] || '').trim();
      if (clean[field].length > 1000) throw Error('Campo demasiado largo.');
    }
    if (!clean.Holder_Name || !clean.Receiver_Phone) throw Error('Nombre y teléfono son obligatorios.');
    return clean;
  });
}
async function key(token, salt) {
  if (!token?.trim()) throw Error('Introduce el token de la API.');
  const material = await crypto.subtle.importKey('raw', encoder.encode(token.trim()), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export async function encryptContacts(records, token) {
  const contacts = validateContacts(records), salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const payload = encoder.encode(JSON.stringify({contacts,updatedAt:new Date().toISOString()}));
  const ciphertext = await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad},await key(token,salt),payload);
  return {version:1,kdf:'PBKDF2-SHA256',iterations,salt:base64(salt),iv:base64(iv),ciphertext:base64(new Uint8Array(ciphertext))};
}
export async function decryptContacts(envelope, token) {
  if (!envelope || envelope.version !== 1 || envelope.kdf !== 'PBKDF2-SHA256' || envelope.iterations !== iterations || typeof envelope.ciphertext !== 'string' || envelope.ciphertext.length > 20000000) throw Error('Archivo cifrado inválido.');
  try {
    const salt=bytes(envelope.salt), iv=bytes(envelope.iv);
    if(salt.length!==16 || iv.length!==12) throw Error('format');
    const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:aad},await key(token,salt),bytes(envelope.ciphertext));
    const data=JSON.parse(new TextDecoder().decode(plain));
    return {contacts:validateContacts(data.contacts),updatedAt:data.updatedAt};
  } catch { throw Error('Token incorrecto o archivo de contactos dañado.'); }
}
