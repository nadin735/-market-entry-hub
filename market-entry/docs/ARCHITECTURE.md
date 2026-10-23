# Architektur

## Stack
React 18.3, Vite 5, Tailwind 3.4, recharts, lucide-react, Schriften lokal über @fontsource (Inter, Noto Sans Arabic). Kein eigener Server.

## Struktur (`market-entry/`)
- `src/Root.jsx`: Hub, Hash-Routing (`#gcc`, `#europe`, `#rechtliches`).
- `src/tools/gcc/App.jsx`, `src/tools/europe/App.jsx`: die beiden Tools (lazy geladen).
- `src/intel.jsx`: Analyse-Bausteine (Regulierung, Wettbewerb, Chancen, Methodik).
- `src/dataI18n.js`: EN/AR-Übersetzung der Marktdaten.
- `src/backend.js`: Konto und Speicher. Supabase über reines `fetch` (kein SDK), Demo-Modus mit lokalem Speicher.
- `src/legal.jsx`, `src/legal/*.js`: Impressum und Datenschutz (DE/EN/AR).
- `src/shell.js`: Demo-Hinweisleiste, optionales Setup-Panel (`?setup=1`, nur mit `VITE_ENABLE_SETUP=1`).
- `supabase/schema.sql`: Tabelle `user_data` mit Row Level Security, Funktion `delete_my_account()`.
- `tests/e2e/`: Playwright (Chromium), Mock-Supabase.

## Build-Varianten
- **Demo** (`VITE_DEMO=1`): kein Netzwerk, kein Login, Tools öffnen direkt das Dashboard mit lokalem Demo-Konto.
- **Normal**: Supabase-Login. URL und Publishable Key über `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.

## Daten
Eine Zeile pro Nutzer in `public.user_data` (`user_id`, `analyses` als JSON je Tool). RLS: Nutzer sehen, ändern und löschen nur die eigene Zeile. Der Service Role Key wird nie im Frontend verwendet.

## Sicherheit
CSP und weitere Header in `vercel.json` / `netlify.toml`, keine Tracker, kein `dangerouslySetInnerHTML`, Client-Sperre nach Fehlversuchen, automatische Abmeldung bei Inaktivität.
