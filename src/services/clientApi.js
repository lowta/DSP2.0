import { config } from '../config.js';

export class ApiError extends Error {
  constructor(message, { status, details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export async function searchClients({ filtroBusqueda, token, signal }) {
  const baseUrl = config.apiBaseUrl.replace(/\/$/, '');
  const url = `${baseUrl}${config.endpoint}`;

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filtroBusqueda,
        token,
      }),
      signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError(
      'No se pudo conectar con la API. Si ocurre desde GitHub Pages, puede ser un problema de CORS y conviene usar un gateway intermedio.',
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
