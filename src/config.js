export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'https://node.secureapp.torreslm.es',
  apiToken: import.meta.env.VITE_API_TOKEN || '',
  endpoint: '/registro',
  initialRenderLimit: 500,
  virtualRowHeight: 52,
  localFilterDebounceMs: 120,
};
