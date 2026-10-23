# Abschlussbericht Master Prompt (Phasen 0–5)

| Änderung | Phase | Datei | Status |
|---|---|---|---|
| Supabase Auth: Registrierung mit E-Mail-Bestätigung, Login, Logout, Passwort-Reset, Recovery-Ansicht | 1 | `*/src/backend.js`, `*/src/App.jsx` | Fertig, gegen simuliertes Supabase getestet (18/18). Nicht gegen echtes Projekt getestet |
| Google / Apple / GitHub Login (Buttons, Aufruf) | 1 | `App.jsx`, `backend.js` | Code fertig; funktioniert erst nach OAuth-Einrichtung (siehe To-do) |
| Zugriffsschutz auf Datenbankebene (RLS), Konto-Löschung per RPC | 1 | `*/supabase/schema.sql` | Fertig, gegen echte Postgres 16 geprüft: Nutzer B kann A weder lesen, ändern, fälschen noch löschen |
| Session-Ablauf (30 min Inaktivität), Sperre nach 5 Fehlversuchen, generische Fehlermeldungen | 1 | `backend.js`, `App.jsx` | Fertig (clientseitig; echtes Rate-Limit liegt bei Supabase Auth) |
| Keine Geheimnisse im Frontend, nur Anon-Key über `VITE_*` | 1 | `.env.example`, `.gitignore` | Fertig |
| Test mit zwei Nutzern | 1 | `*/tests/auth/` | Fertig (SQL-Test + Browser-Test) |
| Designsystem, Typo-Skala, Kontrast AA, Fokus 2 px, Tap-Ziele 44 px | 2 | `DESIGN.md`, `App.jsx` | Fertig, Tap-Ziele automatisch geprüft (0 Verstöße) |
| 3D-Hero (lazy, statisch bei Touch/Reduced Motion) | 2 | `src/HeroObject.jsx` | Fertig (CSS-3D, kein WebGL) |
| Schriften lokal (@fontsource), kein Google-Request | 2 | `main.jsx`, `package.json`, Portfolio `scripts/fonts.mjs` | Code fertig, `npm install` nötig (hier nicht möglich) |
| Screenshots 390 px / 1440 px | 2 | `*/docs/screenshots/` | Fertig; Echt-Schriften fehlen darin (hier gesperrt) |
| Sicherheits-Header (CSP, HSTS, nosniff, Frame-Schutz) | 3 | `vercel.json`, `netlify.toml` | Fertig, nach Deploy prüfen |
| OWASP-Kurzcheck (Sinks, Secrets, rel=noopener, JSON/HTML) | 3 | – | Keine Funde; `innerHTML` im Portfolio nur mit eigenen Übersetzungen |
| Ehrlichere Aussagen (kein „KI-gestützt“, Datenschutz-Text passend zum Backend) | 3/4 | `App.jsx` | Fertig |
| Impressum, Datenschutz (Entwurf) + Footer-Links | 4 | `public/*.html`, Portfolio | Entwurf, Platzhalter offen, nicht rechtlich geprüft |
| install / lint / type-check / tests / build | 3 | – | **Nicht ausgeführt:** npm ist in der Umgebung gesperrt. Bundle-Kompilierung mit esbuild und Browser-Tests liefen |

## Das musst du selbst tun
1. Supabase-Projekt anlegen (EU-Region), `supabase/schema.sql` ausführen, E-Mail-Bestätigung an, Mindestpasswort 10 (`SETUP-SUPABASE.md`).
2. OAuth-Apps anlegen: Google, GitHub, Apple (Apple braucht ein kostenpflichtiges Developer-Konto).
3. `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` in Vercel/Netlify setzen; nie den service_role-Key.
4. Ausgaben-Limits setzen (Supabase Spend Cap, Hosting-Budget-Alarm); Auth-Rate-Limits prüfen.
5. `npm install && npm run build` lokal ausführen und prüfen; im Portfolio `npm install && npm run fonts`.
6. Alle `[PLATZHALTER]` in Impressum und Datenschutz füllen; AVV mit Supabase und Hosting abschließen; rechtlich prüfen lassen.
7. Domain festlegen und `[DOMAIN]` in Sitemap, robots.txt, canonical-Links ersetzen; Supabase Site URL/Redirects setzen.
8. Einmal mit echtem Projekt testen: Registrierung, Bestätigungsmail, Reset-Mail, drei Social-Logins, Konto löschen.

## Rechtliches (Stand 15.10.2026)

- Neue Seite „Rechtliches“ in beiden Tools (DE/EN/AR, ohne Login lesbar, Footer-Links, Link bei der Registrierung, Direktlink `#rechtliches`, `#rechtliches-datenschutz` usw.). Gesetzesgrundlage steht als Badge direkt neben jeder Aussage.
- Inhalt: Impressum (§ 5 DDG, § 18 Abs. 2 MStV), Datenschutzerklärung (Art. 12–14 DSGVO inkl. Rechtsgrundlagen, Art. 28, 44–49, KI-VO Art. 50, § 25 TDDDG, Speicherdauer inkl. § 147 AO / § 257 HGB / § 14b UStG / GoBD, Betroffenenrechte, Sicherheit), Haftung und Hinweise, Nutzung und Urheberrecht.
- In der App: Pflicht-Checkbox bei der Registrierung (auch vor Social-Sign-up), Datenzentrum im Dashboard (Export als JSON, Art. 15/20; Konto löschen, Art. 17).
- Pflichtangaben kommen aus `VITE_LEGAL_*` (siehe `.env.example`). **Offen für dich:** ladungsfähige Anschrift und E-Mail eintragen. Ohne diese Werte zeigt die Seite einen roten Betreiberhinweis mit Abmahnrisiko und Alternativen (c/o, Impressumsservice).
- Prüfen, ob `VITE_SUPABASE_REGION` und `VITE_HOSTING_PROVIDER` zur Realität passen, und den AV-Vertrag (DPA) bei Supabase und beim Hoster abschließen.
- Die Texte sind eine sorgfältige Vorlage und keine Rechtsberatung. Vor dem Livegang juristisch prüfen lassen.
- Die statischen Seiten `public/impressum.html`, `datenschutz.html` leiten jetzt auf die In-App-Seite weiter. Das Portfolio hat weiterhin eigene statische Rechtstexte.

## Klickbare Details und Plan-Kurzfassung (Stand 15.10.2026)

- Die drei PDF-Exporte (Analyse, Strategie, Optimaler Entry-Plan) sind entfernt. Es gibt einen Knopf „Plan-Kurzfassung als PDF“ (eine A4-Seite) in beiden Tools.
- Anklickbar mit mehr Details, in beiden Tools: Phasen im Planüberblick (filtert die Schritte), einzelne Schritte, Länder im Vergleich (Rang, stärkster/schwächster Faktor, Abstand zum Zielmarkt), Hauptrisiken (Auslöser-Faktor und Ø aller Märkte), nächste Schritte (zugehörige Phase und Einzelschritte).

## Vereinte Website, Neutralität, Diagramme, Plan-PDF (Stand 15.10.2026)

- **Hub:** `market-entry/` enthält Auswahlseite + beide Tools (lazy geladen). Rückweg über „Alle Tools“. Ein Konto (Supabase) für beide, Analysen getrennt je Tool. Login/Registrierung direkt im Hub, auch im Demo-Modus ein gemeinsames Konto (Analysen getrennt pro Tool). Mix-Logo (Gulf States ↔ Europe) im Hub.
- **Europe neutral:** Deutschland-Panel oben entfernt. Texte (Strategien, Risiken, Partner, Schritte) ohne deutschen Bezug. Unten ein eigener Abschnitt „Deutschland & DACH“ (an der Stelle des früheren GII-Blocks). GII bleibt im GCC-Tool.
- **Diagramme klickbar:** Strategische Positionierung (Punkte), Radar (Fläche/Legende), Kostenverteilung (Segmente/Legende), Projektion (Jahr), Budget-Sensitivität (Punkt). Detailkarte erscheint unter dem Diagramm.
- **Plan-PDF:** Der Export ist jetzt ein kompletter, mehrseitiger Entry-Plan für den bestplatzierten Markt (Cover, Zusammenfassung, Begründung/Ranking, Marktprofil, Strategie & Partner, Zeitplan mit Entscheidungspunkten, Gantt, alle 13 Schritte, erste 90 Tage, Budget & Finanzplan, Risiken mit Gegenmaßnahmen, nächste Schritte, Quellen).
- **Portfolio:** Titel „… Markteintrittsplan“ statt „Empfehlung“; neue Demo-PDFs (Nordlicht AI Systems GmbH → GCC, Najm Wealth AI LLC → Europa), beide mit PRODUCT / SERVICE und 3 KI-/Digitalprodukten.
- **Nicht geprüft:** echter `npm run build`, echtes Supabase, Firefox/Safari, echte Recharts-Optik (Tests mit SVG-Ersatz; die Klick-Handler nutzen die Recharts-Standard-API).

## Scoring-Transparenz, Quellenstatus, Empfehlung (Okt 2026)
Neues gemeinsames Modul `market-entry/src/intel.jsx`, in beiden Tools identisch (DE/EN/AR):
- **Scoring**: fünf Kriterien mit Definition und Gewicht, Formel, Aufbau der Werte je Land (Basis / Sektor-Fit / Profil), Gewichts-Presets und Schieberegler mit Live-Ranking, Sensitivitätstabelle (10 Szenarien) mit Robustheitsanzeige.
- **Empfehlung**: Kennzahlenleiste mit Tooltips, Panel "Warum dieser Markt?" (Vorsprung, Zielkonflikt zum Zweitplatzierten, Chancen, Barrieren, Risiken, nächste Schritte), alles aus den Scores/Datenobjekten abgeleitet.
- **Datenstatus**: Quelle / Schätzung / Annahme / Nicht belegt. Quellenzeilen mit Herausgeber-Link (nur Startseiten) und Datenjahr. Es wurden keine Zahlen oder Quellen neu erfunden; Quellen sind nicht live nachgeprüft.
- **Wettbewerb**: Tabelle Anbieter/Segment/Überschneidung (Schlagwort-Heuristik) plus Lücke und Positionierung. Zielkunden und Geschäftsmodelle sind nicht belegt (bräuchte lizenzierte Daten).
- **PDF**: Begründung, Methodik und Gewichte, Sensitivität, Erkenntnisse, nächste Schritte, Datenstatus und Quellen.
Hinweis: Marktdaten-Auszüge (Lizenzen, Steuern, Treiber, Wettbewerbs-Notizen) liegen nur auf Deutsch vor und werden in EN/AR mit Hinweis zitiert. Grenzen: nur Chromium getestet; Basis-Scores sind eine Analysten-Rubrik, keine Live-Daten.

## Wow-Features (Okt 2026)
- **Score-Karte**: schematische Low-Poly-Karte (Golf bzw. Europa), Länder nach Score eingefärbt, reagiert live auf die Gewichte; Klick zeigt die fünf Kriterien. Die Umrisse sind von Hand vereinfacht (`src/geo.js`), nicht vermessungsgenau.
- **Szenario-Vergleich**: Länder-Duell (Kriterien, Steuern) und Budget-Szenario (Zielmarkt, Score, Break-even, Zeitraum, Einstieg) nebeneinander; zeigt, ob die Empfehlung bei anderem Budget kippt.
- **Monte-Carlo-Robustheit**: 1.000 zufällige Gewichtungen (fester Seed, reproduzierbar), Siegquote und Ø-Rang je Land; auch in Begründung und PDF.
- **Entscheidungs-Memo**: einseitiges PDF (Empfehlung, drei Gründe, drei Risiken, Budget/Zeit/Ertrag, Ranking, nächste Schritte).
Grenzen: Monte Carlo und Budget-Szenario sind Modellrechnungen auf der Analysten-Rubrik, keine Prognosen; Live-Daten (z. B. Weltbank-API) fehlen weiterhin.

## Qualitätsrunde (EN/AR-Daten, Accessibility, Tests)
- Marktdaten-Auszüge (Steuern, Lizenzen, Wettbewerber, Treiber, Trend, Quellenzeilen) liegen jetzt in EN und AR vor (`src/dataI18n.js`), Zahlen und Fakten unverändert. Der Hinweis "nur Deutsch" entfällt.
- Accessibility: `main`-Landmark und genau eine `h1` je Ansicht, Tooltip-Buttons mit 24 px Trefferfläche, Textkontrast mindestens 4,5:1 (Koralle und Blau leicht aufgehellt), Tastatur-Test.
- Tests: `tests/e2e/` (`npm run test:e2e`): Flow, A11y, Auth (Supabase simuliert), Tool-Login. 96 Prüfungen.
- Nicht erreicht (braucht dich): Live-Datenquellen, Validierung der Scores mit echten Markteintritten, Test gegen dein echtes Supabase, Firefox/Safari.
