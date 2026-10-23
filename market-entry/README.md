# Market Entry – GCC & Europe (vereinte Website)

Eine Website, zwei Tools. Die Startseite (Hub) lässt wählen:

- **GCC Market Entry** (Europa → Golfregion) unter `#gcc`
- **Europe Market Entry** (Golfregion → Europa) unter `#europe`
- Rechtliches (Hub) unter `#rechtliches`, in den Tools z. B. `#gcc/rechtliches-datenschutz`

In jedem Tool bringt der Button „Alle Tools“ zurück zur Auswahl.

## Starten
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # fertige Website in dist/
```
Deployment: Ordner in Vercel/Netlify importieren (`vercel.json`/`netlify.toml` liegen bei) oder `dist/` hochladen.

## Konto
- **Mit Supabase** (Standard in `src/backend.js`, überschreibbar mit `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` oder `?setup=1`; Einrichtung siehe `SETUP-SUPABASE.md`): ein Konto gilt für beide Tools. Die Analysen liegen getrennt pro Tool in derselben Zeile (`user_data.analyses` = `{ "gcc": [...], "europe": [...] }`). Das bestehende Schema bleibt unverändert; ein altes reines Array wird weiter gelesen.
- **Demo Modus** (`VITE_DEMO=1`, die einzelne Demo HTML): keine Anfragen an Supabase, jedes Login wird angenommen, lokale Konten im Browser, ebenfalls **ein gemeinsames Konto** für beide Tools (Analysen getrennt pro Tool). Nur zum Ausprobieren.
- **Login auf der Startseite:** Anmelden/Konto erstellen geht direkt im Hub (mit Pflicht-Datenschutz-Checkbox); danach öffnen beide Tools direkt im Dashboard. Abmelden ebenfalls im Hub.

## Aufbau
```
src/Root.jsx           Hub, Hash-Routing, Rechtliches
src/tools/gcc/App.jsx  GCC Market Entry
src/tools/europe/App.jsx  Europe Market Entry (neutral, eigener Abschnitt Deutschland & DACH)
src/backend.js         gemeinsames Backend (setTool, Analysen je Tool)
src/legal.jsx, src/legal/   Rechtliches (DE/EN/AR)
```
Die Tools werden per `React.lazy` nachgeladen. Details zu Supabase: `SETUP-SUPABASE.md`.
