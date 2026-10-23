# Market Entry – Deployment-Paket

Inhalt
- `market-entry/`          Vereinte Website: Hub mit Auswahl GCC Market Entry / Europe Market Entry (Vite/React)
- `portfolio/`             Portfolio-Website (statisch, direkt hochladbar)
- `demo-pdfs-zum-testen/`  Zwei fiktive KI-/Digital-Demo-PDFs für den PDF-Scanner (je ein Tool)

Ablauf (Node.js 18+ nötig):
1. `cd market-entry`
2. `npm install`
3. `npm run build` → fertige Website in `dist/`
4. `dist/` hochladen, oder den Ordner direkt in Vercel/Netlify importieren (Konfiguration liegt bei).

Das Portfolio braucht keinen Build und kann separat gehostet werden.

Wichtig: Getestet wurde in einer Umgebung ohne `npm` (Bundle mit esbuild, Chromium-Tests: Hub, Login, Analyse, PDF-Scan, Diagramm-Klicks, Plan-PDF, DE/EN/AR). Der erste echte `npm run build` bei dir oder bei Vercel/Netlify ist der letzte Prüfschritt. Echtes Supabase, Firefox und Safari wurden nicht getestet.

## Deployment mit GitHub und Vercel (zwei Projekte, ein Repository)
1. Repository auf GitHub anlegen und diesen Ordner hochladen.
2. Vercel: "Add New Project", Repository wählen, **Root Directory = `market-entry`** (Framework Vite, Build `npm run build`, Ausgabe `dist`). Das ist das Tool.
3. Zweites Vercel-Projekt aus demselben Repository mit **Root Directory = `portfolio`** (Build `npm run build`, Ausgabe `dist`). Das ist das Portfolio.
4. Im Tool-Projekt unter Environment Variables `VITE_LEGAL_EMAIL` (optional, Standard ist gesetzt) und bei Bedarf `VITE_SUPABASE_REGION`, `VITE_HOSTING_PROVIDER` eintragen.
5. Supabase: `market-entry/supabase/schema.sql` einmal im SQL-Editor ausführen.
