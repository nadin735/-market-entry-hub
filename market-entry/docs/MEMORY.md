# Entscheidungen und Kontext

- Projekt ist ein Bewerbungsprojekt ohne Einnahmen. Deshalb nur Impressum + Datenschutz, keine AGB.
- Nadin veröffentlicht ihre Privatadresse nicht. Impressum nennt Name, E-Mail und "Anschrift auf Anfrage". Rechtlich nicht sicher, Risiko bewusst akzeptiert (Stand 20.10.2026).
- Kontakt-E-Mail: nadinokil.contact@gmail.com (Standardwert im Code, überschreibbar mit `VITE_LEGAL_EMAIL`).
- Plattform (Tool) ist wichtiger als das Portfolio. Portfolio bleibt getrennt (Schaufenster), Tool ist der Beweis. Nicht zusammenlegen.
- Zwei Varianten: Demo ohne Login (Datei) und normale Version mit Login (Supabase). Demo-Links im Portfolio öffnen direkt das Tool.
- Supabase-Projekt-URL und Publishable Key stehen als Standardwerte in `backend.js` (öffentlich). Service Role Key nie ins Frontend.
- Hoster im Datenschutz des Portfolios ist Vercel (Annahme, bei Wechsel anpassen).
- Umgebung: npm/pip-Registries gesperrt, Supabase von dort nicht erreichbar, nur Chromium getestet.
- Build mit esbuild und `--define` für alle `VITE_*` Variablen (`import.meta.env` ist sonst undefiniert).
- Design-Regeln stehen in `docs/CHECKLIST.md` Teil 2 und `docs/DESIGN.md`.

## Entscheidungen 23.10.2026
- Drei Startmodi im Hub, gelten für beide Tools: Demodaten ohne Login, Konto mit Mailadresse (Supabase), ohne Login mit eigenen Daten im Browser. Login nur im Hub, Tools zeigen nie ein eigenes Login. Google, Apple, GitHub entfernt.
- `me_mode` (demo, account, local), `jast_demo` folgt dem Modus, erster Besuch startet im Demo Modus.
- Dunkel ist der Standard, Hell wird über `ui_theme` gemerkt.
- Startoptionen werden im Hub gewählt: `jast_demo` (Ohne Login, dauerhaft), `me_start` (einmalig: testdata oder upload).
- Keine Bindestriche in sichtbaren Texten. Zusammengesetzte Wörter werden getrennt oder umformuliert.
