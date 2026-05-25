# DSP2.0 Client Search

Primera version funcional para consultar clientes contra la API existente.

## Desarrollo

```bash
npm install
npm run dev
```

## Configuracion

Copia `.env.example` a `.env` y ajusta:

```bash
VITE_API_BASE_URL=https://node.secureapp.torreslm.es
VITE_API_TOKEN=TOKEN
```

En GitHub Pages el token queda visible en el bundle del frontend. Para produccion, lo recomendable es usar un backend/gateway intermedio y apuntar `VITE_API_BASE_URL` a ese gateway.

## Build para GitHub Pages

```bash
npm run build
```

La carpeta `dist` queda lista para publicar.

El repo incluye un workflow de GitHub Actions que despliega automaticamente a GitHub Pages cuando se hace push a `main`.

## Estructura

- `src/services`: cliente API y preparacion para gateway.
- `src/utils`: normalizacion de nombres y deduplicacion.
- `src/ui`: renderizado de tabla virtualizada.
- `src/main.js`: estado de pantalla y eventos.
