# Aufgaben (Stand 23.10.2026)

## Erledigt
- Hub mit zwei Tools, DE/EN/AR, Testdaten-Button, Analyse, PDF-Report, Export, Konto löschen.
- Supabase-Login per `fetch`, RLS-Schema, Mock-Tests (Chromium): 96 Checks grün.
- Demo ohne Login: Tools öffnen direkt das Dashboard. Standalone-Portfolio enthält die Demo.
- Umfang auf nicht kommerziell reduziert: AGB, Haftungs-/Nutzungstexte, USt-ID, Register, Schlichtung, Sitemap, BFSG-Vorlage entfernt.
- Design nach CHECKLIST Teil 2 bereinigt (Hintergrund-Animation, Glow, Streifen, Großbuchstaben-Labels entfernt).
- Impressum und Datenschutz im Portfolio ausgefüllt (ohne Straße, "Anschrift auf Anfrage").

- Startseite mit drei Modi (Demodaten, Konto mit Mailadresse, eigene Daten im Browser). Login nur dort.
- Logo aus dem Portfolio (EU GCC Bridge) im Hub und in den Tools.
- Hell/Dunkel-Modus für Hub, Tools und Portfolio, gemeinsamer Schlüssel `ui_theme`, Standard dunkel.
- Startoptionen im Hub: Ohne Login, Mit Demodaten testen, Eigene Daten hochladen.
- Texte in Portfolio und Programm ohne Bindestriche und Gedankenstriche, Hub und Portfolio zeigen dieselben Tool Beschreibungen.

## Offen (nur Nadin kann das)
- Supabase: Site URL und Redirect URL auf `https://market-entry.nadin.dev` setzen.
- Supabase: `supabase/schema.sql` im SQL Editor ausführen (Tabelle `user_data` ist noch nicht angelegt).
- AV-Vertrag (DPA) mit Supabase und dem Hoster abschließen, Region (EU) prüfen und in `VITE_SUPABASE_REGION` eintragen.
- Impressum: CHECKLIST verlangt eine ladungsfähige Anschrift. Aktuell steht nur "auf Anfrage". Sauber wäre eine c/o-Adresse oder ein Impressumsservice.
- `npm install` ausführen und `package-lock.json` committen (in der Build-Umgebung war die npm-Registry gesperrt, deshalb fehlt das Lockfile). Danach `npm audit`.
- Live prüfen: HTTPS und Security-Header, echtes Login (Registrieren, Login, Reload, Logout).
- Rechte an Logos und Bildern bestätigen.
- 2FA für Supabase, Hosting, GitHub. Backups prüfen.

## Als Nächstes
- Portfolio und Tool live stellen (Vercel/Netlify), Link ins Anschreiben.
- Optional: kurzer Abschnitt "Über mich" mit Berufserfahrung im Portfolio.
