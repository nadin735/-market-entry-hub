export const DE = {
  title: "Rechtliches", intro: "Impressum und Datenschutzerklärung für {app}. Ohne Anmeldung lesbar. Rechtsgrundlagen stehen jeweils direkt neben der Aussage.",
  toc: [["impressum", "Impressum"], ["datenschutz", "Datenschutz"]],
  back: "Zurück", lawLabel: "Rechtsgrundlage",
  notice: "Orientierungshilfe, keine Rechts-, Steuer- oder Anlageberatung. Nutzung auf eigene Verantwortung und ohne Gewähr. Ergebnisse sind unverbindlich und von dir selbst zu prüfen.",
  noticeMore: "Mehr unter Rechtliches",
  sections: {
    datenschutz: { title: "Datenschutzerklärung", blocks: [
      ["h", "1. Verantwortliche"],
      ["p", "Verantwortlich ist die im Impressum genannte Betreiberin. Kontakt in Datenschutzfragen: die dort genannte E-Mail-Adresse.", "Art. 4 Nr. 7, Art. 13 Abs. 1 lit. a DSGVO"],
      ["p", "Ein Datenschutzbeauftragter ist nicht benannt. Eine Pflicht besteht nicht, solange nicht mindestens 20 Personen ständig mit der automatisierten Verarbeitung personenbezogener Daten beschäftigt sind und keine Verarbeitung vorliegt, die eine Datenschutz-Folgenabschätzung erfordert.", "Art. 37 DSGVO; § 38 BDSG"],
      ["h", "2. Verarbeitete Daten, Zwecke und Rechtsgrundlagen"],
      ["ul", [
        ["Konto und Vertrag: E-Mail-Adresse, Name, Passwort (nur als Hash beim Authentifizierungsdienst), Zeitstempel. Bei Anmeldung über Google, Apple oder GitHub zusätzlich die vom Anbieter übermittelte Kennung und E-Mail-Adresse. Zweck: Konto bereitstellen und Anmeldung ermöglichen.", "Art. 6 Abs. 1 lit. b DSGVO"],
        ["Analysen: Von dir eingegebene Unternehmensangaben, Kennzahlen, Zertifizierungen, Produkte und die berechneten Ergebnisse. Zweck: Analysen speichern und anzeigen. Ohne Konto-Datenbank (Demo-Modus) bleiben sie nur in deinem Browser.", "Art. 6 Abs. 1 lit. b DSGVO"],
        ["E-Mails des Dienstes (Bestätigung, Passwort zurücksetzen). Zweck: Konto bestätigen und sichern.", "Art. 6 Abs. 1 lit. b DSGVO"],
        ["Server-Protokolle beim Hosting-Anbieter (IP-Adresse, Zeitpunkt, aufgerufene Adresse, Browserkennung). Zweck: sicherer, stabiler Betrieb und Abwehr von Angriffen. Berechtigtes Interesse: Sicherheit und Funktionsfähigkeit.", "Art. 6 Abs. 1 lit. f DSGVO"],
        ["Sicherheit und Missbrauchsabwehr: Begrenzung von Fehlversuchen bei der Anmeldung, automatische Abmeldung bei Inaktivität, Ratenbegrenzung des Authentifizierungsdienstes.", "Art. 6 Abs. 1 lit. f DSGVO; Art. 32 DSGVO"],
        ["Einwilligung: Wo künftig optionale Funktionen eine Einwilligung brauchen, wird sie vorher gesondert und freiwillig eingeholt. Du kannst sie jederzeit mit Wirkung für die Zukunft widerrufen. Das Häkchen bei der Registrierung bestätigt nur die Kenntnisnahme dieser Erklärung und ist keine Einwilligung.", "Art. 6 Abs. 1 lit. a, Art. 7 DSGVO"],
        ["PDF- und CSV-Import: Die Dateien werden ausschließlich in deinem Browser gelesen und nicht hochgeladen. Gespeichert werden nur die Felder, die du in eine Analyse übernimmst.", "Art. 5 Abs. 1 lit. c DSGVO"]
      ]],
      ["h", "3. Daten Dritter, Beschäftigtendaten und besondere Kategorien"],
      ["ul", [
        ["Die Anwendung benötigt nur Unternehmenskennzahlen. Bitte gib keine personenbezogenen Daten Dritter ein (z. B. Namen von Beschäftigten, Kundinnen oder Kunden). Tust du es doch, bist du für die Rechtmäßigkeit verantwortlich.", "Art. 6 Abs. 1, Art. 5 Abs. 1 lit. c DSGVO"],
        ["Beschäftigtendaten sind nicht vorgesehen. Soweit du sie dennoch eingibst, gelten die besonderen Anforderungen für Beschäftigte.", "§ 26 BDSG"],
        ["Besondere Kategorien personenbezogener Daten (z. B. Gesundheit, Religion, politische Meinung) sind ausgeschlossen. Bitte gib sie nicht ein. Es gibt dafür keinen Verarbeitungszweck.", "Art. 9 DSGVO"]
      ]],
      ["h", "4. Empfänger und Auftragsverarbeiter"],
      ["ul", [
        ["Supabase (Supabase, Inc., USA): Authentifizierung und Datenbank. Speicherregion: {region}. Mit dem Anbieter besteht ein Auftragsverarbeitungsvertrag.", "Art. 28 DSGVO"],
        ["Hosting und Auslieferung der Webseite: {hosting}. Der Anbieter verarbeitet technische Zugriffsdaten (Server-Protokolle) im Auftrag.", "Art. 28 DSGVO"],
        ["Anmeldeanbieter (Google, Apple, GitHub) nur, wenn du sie selbst wählst. Sie sind für ihre Verarbeitung eigenständig verantwortlich und haben eigene Datenschutzerklärungen.", "Art. 6 Abs. 1 lit. b DSGVO"],
        ["Eine Weitergabe zu Werbezwecken oder ein Verkauf von Daten findet nicht statt. Behörden erhalten Daten nur, wenn eine gesetzliche Pflicht besteht.", "Art. 6 Abs. 1 lit. c DSGVO"]
      ]],
      ["h", "5. Übermittlung in Drittländer"],
      ["p", "Die Anbieter sind teils US-Unternehmen. Eine Übermittlung oder ein Zugriff aus den USA stützt sich auf den Angemessenheitsbeschluss zum EU-US Data Privacy Framework, soweit der Anbieter zertifiziert ist, andernfalls auf Standardvertragsklauseln der EU-Kommission. Eine Kopie erhältst du über die Kontaktadresse.", "Art. 44–46, Art. 45 DSGVO; Beschluss (EU) 2023/1795"],
      ["h", "6. KI-Funktionen"],
      ["p", "Aktuell nutzt {app} keine KI-Modelle. Scores und Empfehlungen entstehen deterministisch aus festen Regeln und hinterlegten Quellen. Es gibt keine automatisierte Entscheidung mit rechtlicher Wirkung für dich. Werden KI-Funktionen ergänzt, werden sie deutlich gekennzeichnet, diese Erklärung wird vorher angepasst, und die Ergebnisse sind von dir zu prüfen.", "Art. 22 DSGVO; Art. 50 KI-VO (EU) 2024/1689"],
      ["h", "7. Speicherung im Browser (kein Cookie-Banner nötig)"],
      ["p", "Es werden nur technisch notwendige Daten im localStorage deines Browsers abgelegt: Sprache, Darstellung (hell/dunkel), Anmeldesitzung, im Demo-Modus lokale Konten sowie der Zähler für Anmelde-Fehlversuche. Sie sind für den vom dir gewünschten Dienst unbedingt erforderlich. Deshalb ist keine Einwilligung und kein Cookie-Banner nötig. Es gibt kein Tracking, keine Analyse- und keine Werbe-Technik. Schriften werden lokal ausgeliefert. Würde künftig Tracking oder Analytics eingesetzt, würde dafür vorher eine Einwilligung eingeholt.", "§ 25 Abs. 2 Nr. 2 TDDDG; für Tracking: § 25 Abs. 1 TDDDG, Art. 6 Abs. 1 lit. a DSGVO"],
      ["h", "8. Speicherdauer und Löschung"],
      ["ul", [
        ["Konto und Analysen bleiben, bis du sie löschst oder das Konto löschst. Die Löschung im Datenzentrum erfolgt sofort und endgültig.", "Art. 5 Abs. 1 lit. e, Art. 17 DSGVO"],
        ["Server-Protokolle werden vom Hosting-Anbieter nur kurzzeitig vorgehalten und danach gelöscht oder anonymisiert.", "Art. 5 Abs. 1 lit. e DSGVO"],
        ["Gesetzliche Aufbewahrungsfristen gelten für die Betreiberin nur bei Buchhaltungsdaten (z. B. Rechnungen, falls entgeltliche Leistungen erbracht werden). Derzeit: Rechnungen und Buchungsbelege 8 Jahre, Handels- und Geschäftsbriefe 6 Jahre, Bücher und Jahresabschlüsse 10 Jahre, nach den GoBD ordnungsgemäß und unveränderbar. Deine Analysen sind keine Buchführungsunterlagen und werden nicht deshalb vorgehalten.", "§ 147 AO; § 257 HGB; § 14b UStG; GoBD"]
      ]],
      ["h", "9. Deine Rechte"],
      ["ul", [
        ["Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit.", "Art. 15, 16, 17, 18, 20 DSGVO"],
        ["Widerspruch gegen Verarbeitungen auf Grundlage berechtigter Interessen.", "Art. 21 DSGVO"],
        ["Widerruf einer Einwilligung jederzeit mit Wirkung für die Zukunft.", "Art. 7 Abs. 3 DSGVO"],
        ["Beschwerde bei einer Datenschutz-Aufsichtsbehörde, z. B. am Ort deines Wohnsitzes oder Arbeitsplatzes oder am Sitz der Betreiberin (zuständig: die Landesdatenschutzbehörde des Bundeslandes der Betreiberin).", "Art. 77 DSGVO"],
        ["Im Datenzentrum kannst du deine Daten selbst exportieren (Art. 15, 20) und dein Konto löschen (Art. 17). Anfragen werden innerhalb eines Monats beantwortet.", "Art. 12 Abs. 3 DSGVO"],
        ["Die Bereitstellung der Konto-Daten ist für die Nutzung erforderlich. Ohne sie ist kein Konto möglich.", "Art. 13 Abs. 2 lit. e DSGVO"]
      ]],
      ["h", "10. Sicherheit und Datenpannen"],
      ["p", "Technische und organisatorische Maßnahmen: verschlüsselte Übertragung (TLS), Zugriffsschutz auf Zeilenebene (jede Person sieht nur ihre Daten), gehashte Passwörter beim Authentifizierungsdienst, Mindest-Passwortlänge, Sperre nach Fehlversuchen, automatische Abmeldung bei Inaktivität, strenge Sicherheits-Header. Absolute Sicherheit gibt es nicht. Bei einer Verletzung des Schutzes personenbezogener Daten meldet die Betreiberin sie innerhalb von 72 Stunden der Aufsichtsbehörde und informiert Betroffene bei hohem Risiko unverzüglich.", "Art. 25, 32, 33, 34 DSGVO"]
    ]},
  },
  imp: {
    title: "Impressum",
    provider: "Anbieterin", contact: "Kontakt", email: "E-Mail", phone: "Telefon (optional)", responsible: "Verantwortlich für den Inhalt",
    laws: { provider: "§ 5 Abs. 1 Nr. 1 DDG", contact: "§ 5 Abs. 1 Nr. 2 DDG", responsible: "§ 18 Abs. 2 MStV" },
    missingTitle: "Hinweis für die Betreiberin: Pflichtangaben fehlen",
    missing: "Für ein rechtssicheres Impressum fehlen noch: {list}. Ohne ladungsfähige Anschrift und E-Mail-Adresse ist das Impressum unvollständig. Das kann kostenpflichtig abgemahnt werden (Wettbewerbs- und Verbraucherverbände, § 5 DDG, § 3a UWG, Bußgeld bis 50.000 € nach § 33 DDG). Eine ladungsfähige Anschrift ist zwingend, ein Postfach genügt nicht.",
    alt: "Alternativen, wenn du deine Privatadresse nicht veröffentlichen willst: eine c/o-Adresse oder ein Impressumsservice mit ladungsfähiger Anschrift (zusätzlich zur Geschäftsadresse einer Kanzlei, eines Coworking-Spaces oder eines Büroservices). Wichtig: Die Anschrift muss tatsächlich Post an dich zustellbar machen. Setze die Werte als Umgebungsvariablen VITE_LEGAL_* (siehe README).",
    missingStreet: "Straße und Hausnummer", missingZip: "PLZ und Ort", missingEmail: "E-Mail-Adresse",
  },
  dc: {
    title: "Datenzentrum", desc: "Deine Daten gehören dir. Hier kannst du sie exportieren oder dein Konto samt allen Daten löschen.",
    export: "Meine Daten exportieren (JSON)", exportLaw: "Art. 15, 20 DSGVO", del: "Konto und alle Daten löschen", delLaw: "Art. 17 DSGVO", delSure: "Wirklich alles löschen? Zum Bestätigen erneut klicken.", exported: "Export wurde erstellt.", legal: "Rechtliches", demoNote: "Im Demo-Modus liegen alle Daten nur in diesem Browser."
  },
  consent: { label: "Ich habe die", link: "Datenschutzerklärung", labelEnd: " gelesen.", error: "Bitte bestätige, dass du die Datenschutzerklärung gelesen hast." },
  final: "Diese Texte sind eine sorgfältig erstellte Vorlage und keine Rechtsberatung. Bitte lasse sie vor dem Livegang einmal juristisch prüfen, insbesondere Impressum und Datenschutzerklärung. Stand: Oktober 2026."
};
