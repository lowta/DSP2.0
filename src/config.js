export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'https://node.secureapp.torreslm.es',
  contactsUrl: import.meta.env.VITE_CONTACTS_URL || 'https://raw.githubusercontent.com/lowta/DSP2.0/refs/heads/main/public/data/contacts.enc.json',
  endpoint: '/registro',
  initialRenderLimit: 500,
  virtualRowHeight: 52,
  localFilterDebounceMs: 120,
};
