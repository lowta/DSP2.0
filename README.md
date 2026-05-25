# DSP2.0 Client Search

Primera version funcional para consultar clientes contra la API existente.

## Desarrollo

```bash
npm install
npm run dev
```

## Configuracion frontend

Copia `.env.example` a `.env` y ajusta:

```bash
VITE_SUPABASE_URL=https://dvqlapwygupdgdpjboon.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_a_uacD1TJkGwgFzw91pKlg_LJJDon34
```

La publishable key de Supabase puede vivir en frontend. El token de la API original no debe guardarse en `.env` frontend ni en el repo.

## Supabase

La app usa Supabase Auth y una Edge Function `search-clients` como gateway seguro hacia la API original.

Aplica la migracion SQL en Supabase y configura los secrets de la funcion:

```bash
supabase link --project-ref dvqlapwygupdgdpjboon
supabase db push
supabase secrets set ORIGINAL_API_TOKEN=... ALLOWED_EMAILS=ltrlambrecht@gmail.com
supabase functions deploy search-clients
```

El token original queda en Supabase Secrets y nunca se envia al navegador.

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
- `supabase/functions`: Edge Functions.
- `supabase/migrations`: tablas y politicas RLS.
