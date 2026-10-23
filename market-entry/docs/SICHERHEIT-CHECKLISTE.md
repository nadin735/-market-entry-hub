# Checkliste (Bewerbungsprojekt, nicht kommerziell) (Stand: Code-Prüfung Oktober 2026)

Keine Rechtsberatung. Status: ✅ im Code belegt, ⚠️ offen, ❌ fehlt. P = gesetzliche Pflicht, BP = Best Practice.

## Von dir zu erledigen (nicht aus dem Code lösbar)
- [ ] P Impressum: nur E-Mail gesetzt, Anschrift "auf Anfrage". Rechtlich nicht sicher; c/o-Adresse wäre die saubere Lösung.
- [ ] P Datenschutz: Supabase Region nachsehen, `VITE_SUPABASE_REGION` setzen, DPA mit Supabase abschließen, Text juristisch prüfen lassen.
- [ ] BP Supabase: `supabase/schema.sql` ausführen; Redirect URLs nur deine Domain; "Confirm email" an; Passwort Mindestlänge 10.
- [ ] BP `npm install` (erzeugt `package-lock.json`, danach committen), `npm audit`, Dependabot aktivieren.
- [ ] BP Backups: Tarif prüfen oder regelmäßig `pg_dump`.
- [ ] BP 2-Faktor-Anmeldung für Supabase, Hosting und GitHub. Service Role Key nie ins Frontend.
- [ ] BP Live prüfen: HTTPS und Security Header auf der echten Domain (z. B. securityheaders.com).
- [ ] BP Rechte an Logos und Bildern bestätigen.

## Erledigt im Projekt
- ✅ `.gitignore` (schützt `.env`), `LICENSE` (Platzhalter "alle Rechte vorbehalten"), `THIRD-PARTY-NOTICES.md`.
- ✅ `?setup=1` Panel standardmäßig aus (nur mit `VITE_ENABLE_SETUP=1`).
- ✅ Security Header (CSP, HSTS, nosniff, X-Frame-Options, Referrer, Permissions) in `vercel.json` und `netlify.toml`.
- ✅ Row Level Security, kein eigenes SQL, kein `dangerouslySetInnerHTML`, keine Secrets im Code, keine Tracker (kein Cookie-Banner nötig).

## Bekannte Restrisiken
- Login Token liegt im localStorage (bei XSS auslesbar, bei einer SPA ohne Server üblich). Die CSP (`script-src 'self'`) senkt das Risiko.
- `style-src 'unsafe-inline'` in der CSP (nötig für Inline Styles der App).
- Demo Modus: lokale Passwörter nur SHA-256 ohne Salt. Nie echte Passwörter im Demo Modus nutzen.
- Cookie Banner wird Pflicht, sobald Analytics, Embeds oder Drittanbieter Skripte dazukommen.
