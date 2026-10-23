# Supabase Login: Einrichtung und Deployment

Das Login nutzt die Supabase Auth REST API direkt per `fetch`. Es gibt kein SDK. Die öffentlichen Zugangsdaten stehen als Standard in `src/backend.js` (`DEFAULT_SB`). Der Service Role Key wird nirgends benutzt und darf nie ins Frontend oder in diese ZIP.

## Konfiguration (Reihenfolge)
1. Browser Override: `localStorage` `jast_sb_url` und `jast_sb_key` (setzen über `?setup=1`).
2. Build Variablen `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` (optional, siehe `.env.example`).
3. Standard `DEFAULT_SB` in `src/backend.js`.

Ein Node Server existiert nicht, deshalb gibt es kein `/api/config` und keine Server Prüfung des Tokens. Die Prüfung übernimmt Supabase selbst (Row Level Security, `auth.uid()`).

## Was im Supabase Dashboard zu tun ist (Checkliste)
1. **SQL Editor:** Inhalt von `supabase/schema.sql` einfügen und ausführen. Das legt `user_data` mit Row Level Security und `delete_my_account()` an. Ohne diesen Schritt klappt das Login, aber Analysen werden nicht gespeichert.
2. **Authentication, Providers:** Email aktivieren.
3. **Authentication, URL Configuration:** Site URL auf die Deploy Domain setzen. Bei Redirect URLs die Domain sowie `http://localhost:5173` und `http://localhost:3000` eintragen.
4. **Optional:** "Confirm email" ausschalten, damit Tests ohne Mail gehen. Für den Echtbetrieb eingeschaltet lassen.
5. **Passwort Mindestlänge** auf 10 stellen (die App verlangt 10 Zeichen).
6. Social Logins (Google, Apple, GitHub) sind optional. Callback URL: `https://zovkeyyvtaevtkmymiqt.supabase.co/auth/v1/callback`.

## Deployment
```bash
npm install
npm run dev      # http://localhost:5173
npm run build   # dist/ hochladen oder Ordner in Vercel/Netlify importieren
```
Die mitgelieferte `Content-Security-Policy` erlaubt Verbindungen zu `https://*.supabase.co`.

## Verbindung ändern (nur wenn `VITE_ENABLE_SETUP=1` gebaut wurde, standardmäßig AUS)
`https://DEINE-DOMAIN/?setup=1` öffnet ein kleines Panel, in dem URL und Key geprüft, gespeichert oder zurückgesetzt werden. Die Werte gelten nur in diesem Browser.

## Demo Version (eine HTML Datei)
`Demo_Market-Entry_Hub.html` stellt keine Anfragen an supabase.co und läuft offline. Oben steht "Demo Modus". Es gibt kein Login: ein Klick auf ein Tool öffnet direkt das Dashboard (lokales Demo-Konto, Daten bleiben im Browser). Die Version mit Login ist der normale Build mit Supabase. Der Schalter ist die Build Variable `VITE_DEMO=1` oder `localStorage jast_demo = 1`.

## Tests included (`tests/auth/`)
- `rls_test.sql` + `rls_two_users.sql`: run against any Postgres to prove user B cannot read, change, forge or delete user A's data (`rls_result.txt` = recorded output).
- `tests/e2e/` (`npm run test:e2e`, Anleitung in `tests/e2e/run_all.py`): `test_flow.py` (Testdaten, Analyse, Panels, EN/AR ohne deutsche Reste), `test_a11y.py` (Namen, Labels, Landmarks, Kontrast, Tastatur), `test_auth_rest.py` und `test_auth_tools.py`: Browser Ablauf (Registrieren, unbestätigte Mail, falsches Passwort, Login, Reload, abgelaufener Token mit Refresh, Speichern und Laden, Abmelden, Netzwerkfehler, blockierter localStorage, Demo ohne Netz) gegen ein simuliertes Supabase per Request Abfangen. Ersetzt NICHT einen Test mit deinem echten Projekt.

## Rechtliches (Impressum, Datenschutz)

Die Seite „Rechtliches“ ist im Tool eingebaut (DE/EN/AR, ohne Login lesbar, Link im Footer und bei der Registrierung). Deine Pflichtangaben trägst du als Umgebungsvariablen ein (siehe `.env.example`, Abschnitt `VITE_LEGAL_*`), zum Beispiel in Vercel/Netlify unter „Environment Variables“. Danach neu deployen.

- Pflicht: `VITE_LEGAL_EMAIL`. Straße und PLZ sind optional. Ohne sie steht "Anschrift auf Anfrage per E-Mail" im Impressum (rechtlich nicht sicher, eine c/o-Adresse wäre sicherer).
- `VITE_SUPABASE_REGION` und `VITE_HOSTING_PROVIDER` müssen zur Realität passen (Supabase-Projektregion, tatsächlicher Hoster). Nutze für Supabase eine EU-Region und schließe den Auftragsverarbeitungsvertrag (DPA) im Supabase-Dashboard ab.
- Es gibt bewusst nur Impressum und Datenschutz (nicht kommerzielles Bewerbungsprojekt: keine AGB, keine USt-ID, keine Schlichtungsangaben). Sobald Einnahmen dazukommen, braucht es mehr.
