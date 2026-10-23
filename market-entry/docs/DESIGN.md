# Design

Ruhig, dunkel, matt. Wenig Dekoration, viel Weißraum.

## Farben
- Hintergrund `#050608`, Karten `rgba(255,255,255,0.03)`, Linien `rgba(255,255,255,0.12)`.
- Text `#EDEAE2`, gedämpfter Text `#A5A8B2` (Kontrast mind. 4,5:1).
- GCC Market Entry: Gold `#C8A96B`. Europe Market Entry: Blau `#5F8BC3`. Warnfarbe Koralle `#D56F55`.

## Schrift
Inter (Latein), Noto Sans Arabic (Arabisch), beide lokal. Zahlen tabellarisch.

## Regeln
- Keine Großbuchstaben-Labels über Überschriften, keine farbigen Streifen auf Karten, kein Glow, keine Gitterlinien, keine Glas-Karten, keine lila Verläufe, keine Emojis als Icons (lucide-react).
- Animationen nur als Feedback (Hover, Fokus). `prefers-reduced-motion` wird beachtet.
- Hit-Flächen mind. 44 px (Hilfe-Tooltips 24 px).
- Eine Hauptaktion pro Screen.

## Komponenten
Karten mit Radius 10 px, Buttons Radius 4 px, Eingabefelder 44 px hoch, sichtbarer Fokusring in Akzentfarbe.
