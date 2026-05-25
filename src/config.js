export const config = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'https://dvqlapwygupdgdpjboon.supabase.co',
  supabasePublishableKey:
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_a_uacD1TJkGwgFzw91pKlg_LJJDon34',
  searchFunctionName: 'search-clients',
  initialRenderLimit: 500,
  virtualRowHeight: 52,
  localFilterDebounceMs: 120,
};
