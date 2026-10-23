# Regeln

## Zusammenarbeit
- Nur ändern, was verlangt ist. Nichts "nebenbei" umbauen.
- Kurze, direkte Antworten auf Deutsch. Fertige Dateien liefern.
- Ehrlich über Grenzen. Keine erfundenen Belege, Zahlen oder Testimonials.
- Bewertet wird die Plattform (Tool), nicht nur das Portfolio.

## Code
- Secrets nie im Frontend oder in der ZIP. Nur öffentliche Keys im Client.
- Jede Tabelle hat RLS mit Policies.
- Neue sichtbare Texte immer in DE, EN und AR.
- Kein `import.meta.env.DEV`. Alle genutzten `VITE_*` Variablen im esbuild-Build definieren.
- Nach jeder Änderung: Build und `tests/e2e/run_all.py` (Chromium).
- Barrierefreiheit: Labels, Fokus, Kontrast mind. 4,5:1, Tastaturbedienung.

## Rechtliches
Nicht kommerziell: nur Impressum und Datenschutz. Sobald Geld fließt, neu prüfen (AGB, Widerruf, Steuern, BFSG).

## Export
Siehe `docs/CHECKLIST.md` (alle drei Teile vor jedem Abschluss).
