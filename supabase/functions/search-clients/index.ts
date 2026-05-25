import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type ApiClient = {
  Tracking_id?: string;
  Holder_Name?: string;
  Detail_Address?: string;
  City?: string;
  Province?: string;
  Receiver_Phone?: string;
};

Deno.serve(async (request) => {
  try {
    if (request.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return json({ message: 'Method not allowed' }, 405);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const originalApiToken = Deno.env.get('ORIGINAL_API_TOKEN');
    const allowedEmails = (Deno.env.get('ALLOWED_EMAILS') || '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);

    if (!supabaseUrl || !anonKey || !originalApiToken) {
      return json({ message: 'Gateway incompleto. Faltan secrets de Supabase.' }, 500);
    }

    const authorization = request.headers.get('Authorization') || '';
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser();

    if (userError || !userData.user?.email) {
      return json({ message: 'Sesion invalida.' }, 401);
    }

    const email = userData.user.email.toLowerCase();
    if (allowedEmails.length > 0 && !allowedEmails.includes(email)) {
      return json({ message: 'Usuario no autorizado.' }, 403);
    }

    let body: { filtroBusqueda?: string };
    try {
      body = await request.json();
    } catch {
      return json({ message: 'JSON invalido.' }, 400);
    }

    const filtroBusqueda = String(body.filtroBusqueda || '').trim();
    if (!filtroBusqueda) {
      return json({ message: 'No recibio datos para buscar.' }, 400);
    }

    const [originalResults, customResults] = await Promise.all([
      searchOriginalApi(filtroBusqueda, originalApiToken),
      searchCustomClients({ supabaseUrl, serviceRoleKey, filtroBusqueda }),
    ]);

    const results = [...originalResults, ...customResults];
    if (results.length === 0) {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    return json(results, 200);
  } catch (error) {
    return json({ message: error instanceof Error ? error.message : 'Error inesperado en gateway.' }, 500);
  }
});

async function searchOriginalApi(filtroBusqueda: string, token: string): Promise<ApiClient[]> {
  const response = await fetch('https://node.secureapp.torreslm.es/registro', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ filtroBusqueda, token }),
  });

  if (response.status === 204) return [];

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.message || `API original respondio con status ${response.status}.`);
  }

  return Array.isArray(payload) ? payload : [];
}

async function searchCustomClients({
  supabaseUrl,
  serviceRoleKey,
  filtroBusqueda,
}: {
  supabaseUrl: string;
  serviceRoleKey?: string;
  filtroBusqueda: string;
}): Promise<ApiClient[]> {
  if (!serviceRoleKey) return [];

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const terms = filtroBusqueda
    .split('|')
    .map((term) => term.trim())
    .filter(Boolean)
    .slice(0, 20);

  if (terms.length === 0) return [];

  const batches = await Promise.all(
    terms.map(async (term) => {
      const safeTerm = term.replace(/[%_,]/g, '');
      const { data, error } = await adminClient
        .from('custom_clients')
        .select('holder_name, receiver_phone, detail_address, city, province')
        .or(`holder_name.ilike.%${safeTerm}%,detail_address.ilike.%${safeTerm}%,receiver_phone.ilike.%${safeTerm}%`)
        .limit(1000);

      if (error) throw error;
      return data || [];
    }),
  );

  return batches.flat().map((row) => ({
    Holder_Name: row.holder_name,
    Receiver_Phone: row.receiver_phone,
    Detail_Address: row.detail_address,
    City: row.city,
    Province: row.province,
  }));
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}
