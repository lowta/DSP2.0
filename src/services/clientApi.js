import { config } from '../config.js';
import { getCurrentSession } from './supabaseClient.js';

export class ApiError extends Error {
  constructor(message, { status, details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export async function searchClients({ filtroBusqueda, signal }) {
  const session = await getCurrentSession();
  if (!session?.access_token) {
    throw new ApiError('Inicia sesion para buscar clientes.', { status: 401 });
  }

  const baseUrl = config.supabaseUrl.replace(/\/$/, '');
  const url = `${baseUrl}/functions/v1/${config.searchFunctionName}`;

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: config.supabasePublishableKey,
      },
      body: JSON.stringify({
        filtroBusqueda,
      }),
      signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError(
      'No se pudo conectar con el gateway de busqueda.',
      { details: error },
    );
  }

  if (response.status === 204) {
    return {
      status: 204,
      results: [],
      message: 'No se encontraron resultados',
    };
  }

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    throw new ApiError(payload?.message || `La API respondio con status ${response.status}.`, {
      status: response.status,
      details: payload,
    });
  }

  if (!Array.isArray(payload)) {
    throw new ApiError('La API no devolvio un array de resultados.', {
      status: response.status,
      details: payload,
    });
  }

  return {
    status: response.status,
    results: payload,
  };
}
