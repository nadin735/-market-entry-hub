/* Market-intelligence helpers shared by both tools: transparent scoring, weight sensitivity,
 * reasoned recommendation, data-status labels and source links.
 * Nothing here invents market data: every number comes from the tools' own data objects or is
 * computed from the factor scores; interpretive text is labelled as derived/estimate. */
import React, { useState } from "react";
import { GEO } from "./geo.js";

export const FACTORS = ["market", "competition", "regulatory", "partner", "investment"];
export const PRESETS = [
  { id: "equal", w: [20, 20, 20, 20, 20] },
  { id: "growth", w: [35, 10, 10, 15, 30] },
  { id: "risk", w: [15, 25, 30, 15, 15] },
  { id: "partner", w: [20, 10, 15, 40, 15] },
  { id: "speed", w: [10, 15, 35, 25, 15] }
];

const I = {
  de: {
    kpiTitle: "Kennzahlen im Überblick", kpiTarget: "Empfohlener Markt", kpiScore: "Gesamtscore", kpiMargin: "Vorsprung auf Platz 2", kpiRobust: "Robustheit", kpiTime: "Zeitraum", kpiBudget: "Budget", kpiBE: "Break-even",
    pts: "Pkt.", robustVal: "{n} von {m} Szenarien", tipScore: "Gewichteter Durchschnitt der fünf Kriterien (0 bis 100). Standard: gleiche Gewichte (je 20 %). Ein Wert aus dem Analystenraster, keine gemessene Marktgröße.", tipMargin: "Abstand zwischen Platz 1 und Platz 2. Unter 3 Punkten ist die Rangfolge knapp und sollte mit Zusatzinformationen abgesichert werden.", tipRobust: "In wie vielen Gewichtungsszenarien (Presets und je ein Kriterium doppelt betont) bleibt der empfohlene Markt auf Platz 1?",
    sTitle: "Scoring Methodik & Sensitivität", sSub: "So entsteht der Score, und wie stabil ist das Ranking?",
    estimate: "Die Länderwerte sind eine Analystenraster (Schätzung) und keine live gemessenen Marktdaten. Sie werden mit Sektor und Unternehmensprofil angepasst.",
    critTitle: "Die fünf Kriterien", critCol: "Kriterium", whatCol: "Was gemessen wird", wCol: "Gewicht", higher: "Höher heißt",
    def: { market: "Nachfragepotenzial und Wachstum des Zielmarkts für Ihre Branche.", competition: "Wettbewerbsspielraum: wie viel Platz neben etablierten Anbietern bleibt.", regulatory: "Aufwand für Gründung, Zulassungen und Steuern.", partner: "Verfügbarkeit geeigneter Vertriebspartner, Joint Venture Partner und Netzwerkpartner.", investment: "Investitionsklima, Anreize und Kapitalzugang." },
    hi: { market: "größeres Potenzial", competition: "weniger gedrängt", regulatory: "einfacher / schneller", partner: "mehr geeignete Partner", investment: "günstigeres Klima" },
    formulaTitle: "Berechnung", formula: "Gesamtscore = Σ (Gewicht × Kriteriumswert) ÷ Σ Gewichte. Kriteriumswert = Basis Rubrik des Landes + Sektor Fit + Anpassung durch Ihr Unternehmensprofil (Zertifikate, Segmente, Vertriebskanäle, Größe, Budget), begrenzt auf 0 bis 100.",
    partsTitle: "Aufbau der Werte für {c}", base: "Basis", sector: "Sektor-Fit", company: "Profil", final: "Wert",
    wTitle: "Gewichte selbst testen", wHint: "Schieberegler ändern die Gewichte (werden auf 100 % normiert). Das Ranking aktualisiert sich sofort.", reset: "Zurücksetzen", live: "Ranking mit Ihren Gewichten", vsBase: "gegenüber Standard",
    presets: { equal: "Gleichgewichtet (Standard)", growth: "Wachstumsfokus", risk: "Risiko / Compliance", partner: "Partner & Netzwerk", speed: "Schnell zum Markt" }, focus: "Fokus {f} (40 %)",
    sensTitle: "Sensitivitätsanalyse", sensIntro: "Rang je Land unter verschiedenen Gewichtungen. Die Presets sind illustrative Szenarien, keine Marktdaten.", scen: "Szenario",
    robustText: "{c} liegt in {n} von {m} Szenarien auf Platz 1.", robustHigh: "Das Ergebnis ist robust.", robustMid: "Das Ergebnis hängt spürbar von der Gewichtung ab; Prioritäten vorab klären.", robustLow: "Das Ergebnis ist gewichtungsabhängig; die Empfehlung sollte durch Zusatzanalysen gestützt werden.",
    whyTitle: "Warum dieser Markt?", whyLead: "{c} führt mit {s}/100, {m} Punkte vor {r}.", whyClose: "Der Abstand ist knapp, die Entscheidung sollte nicht allein am Score hängen.", whyClear: "Der Abstand ist deutlich.",
    leadsOn: "{c} liegt vorn bei: {list}.", trailsOn: "{r} wäre besser bei: {list}.", noTrade: "{r} ist in keinem Kriterium besser.",
    opp: "Chancen", risk: "Risiken", barr: "Markteintrittsbarrieren", trade: "Strategischer Zielkonflikt", next: "Praktische nächste Schritte", derived: "aus den Scores abgeleitet",
    oppF: { market: "Großer bzw. wachsender Nachfragepool", competition: "Wettbewerbsspielraum neben etablierten Anbietern", regulatory: "Vergleichsweise unkomplizierter Marktzugang", partner: "Starkes Partner Ökosystem (Vertrieb/JV möglich)", investment: "Unterstützendes Investitionsklima" },
    barrF: { market: "Begrenzte Nachfrage: Volumen vor Skalierung validieren.", competition: "Dichter Wettbewerb: klare Nischen Differenzierung nötig.", regulatory: "Zulassungen/Lizenzen können den Start verzögern: Anträge früh stellen.", partner: "Wenige geeignete Partner: 2 bis 3 Kandidaten parallel prüfen.", investment: "Höhere Kapitalintensität: Budget in Tranchen freigeben." },
    st: { s1: "Pilotkunde (1 bis 2) in {c} gewinnen und Nachfrage messen (Monat 0 bis 2). KPI: Angebote, Pilotumsatz.", s2: "Rechtsform und Genehmigung klären: {lic}", s3: "Steuern vor Ort prüfen lassen: Körperschaftsteuer {tax}, Umsatzsteuer {vat}{date}.", s4: "Partner ansprechen: {p}", s5: "Budget von {b} €M in Tranchen an die Phasen Entscheidungspunkte koppeln.", s6: "Nach 3 Monaten Review: Annahmen und Scores mit realen Pilotdaten aktualisieren." },
    status: { sourced: "Quelle", estimate: "Schätzung", assumption: "Annahme" },
    statusDef: { sourced: "Veröffentlichte Statistik mit genannter Quelle und Jahr. Hier nicht live nachgeprüft: vor Entscheidungen bei der Originalquelle prüfen.", estimate: "Analysten Einschätzung oder Prognose, keine gemessene Größe.", assumption: "Modellannahme (z. B. Finanzmodell, Zeitplan), vereinfacht und illustrativ." },
    legend: "Datenstatus", srcLabel: "Quelle", asOf: "Stand", noLink: "kein direkter Link", linkNote: "Links führen zur Startseite des Herausgebers, nicht zur Einzelseite.",
    compTitle: "Wettbewerbsstruktur", cPlayer: "Anbieter", cSeg: "Segment", cOverlap: "Überschneidung mit Ihrer Branche", ovD: "direkt", ovA: "angrenzend", ovL: "gering", cGap: "Marktlücke / Chance", cPos: "Empfohlene Positionierung", posNiche: "Spezialisierte Nische statt Breitenwettbewerb: Großkonzerne nicht frontal angreifen.", posPartner: "Über einen lokalen Partner eintreten und dessen Kundenzugang nutzen.", posDirect: "Direkter Eintritt mit klarer Differenzierung gegenüber den überlappenden Anbietern.", heur: "Heuristik: Zuordnung über Schlagworte, kein Marktanteilswert.", compNote: "Zielkunden und Geschäftsmodelle der Anbieter sind hier nicht belegt; dafür wäre eine lizenzierte Marktdatenquelle nötig.",
    langNote: "",
    mapTitle: "Score-Karte",
    mapSub: "Farbe = Gesamtscore mit den Gewichten aus dem Panel darunter.",
    mapNote: "Schematische Darstellung, keine maßstabsgetreue Karte.",
    mapLow: "niedriger",
    mapHigh: "höher",
    mapPick: "Land anklicken für Details",
    rank: "Rang",
    mcTitle: "Monte-Carlo-Robustheit",
    mcIntro: "{n} zufällige Gewichtungen (Simulation mit fester Zufallsbasis, reproduzierbar). Zeigt, wie oft jedes Land gewinnt.",
    mcLine: "{c} gewinnt in {p} % der {n} Gewichtungen.",
    mcAvg: "Ø Rang",
    mcWin: "Siege",
    cmpTitle: "Szenario-Vergleich",
    cmpSub: "Zwei Märkte oder zwei Budgets direkt gegenübergestellt.",
    duelTitle: "Länder-Duell",
    budgetTitle: "Budget-Szenario",
    scA: "Szenario A",
    scB: "Szenario B",
    current: "Aktuell",
    alt: "Alternative",
    budgetLbl: "Budget (€M)",
    rTarget: "Empfohlener Markt",
    rScore: "Gesamtscore",
    rBE: "Break-even",
    rTime: "Zeitraum",
    rStrat: "Einstieg",
    rTax: "Körperschaftsteuer",
    rVat: "Umsatzsteuer",
    duelVerdict: "{a} führt bei {n} von 5 Kriterien vor {b}.",
    duelTie: "Beide Märkte liegen gleichauf.",
    budgetSame: "Bei {b} €M bleibt die Empfehlung {c}.",
    budgetChange: "Bei {b} €M wechselt die Empfehlung von {c1} zu {c2}.",
    scenNote: "Modellrechnung: Score und Gewinnschwelle folgen den Annahmen des Finanzmodells (illustrativ).",
    memoBtn: "Entscheidungs Memo (1 Seite)",
    memoTitle: "Entscheidungs-Memo",
    memoRec: "Empfehlung",
    memoWhy: "Drei Gründe",
    memoRisks: "Drei Risiken",
    memoCost: "Budget, Zeit, Ertrag",
    memoNext: "Nächste Schritte",
    memoRank: "Ranking",
    memoAsk: "Entscheidung: Pilotphase in {c} mit {b} €M freigeben, Budget tranchenweise.",
    memoBasis: "Basis: Analystenraster (Schätzung) und Quellen laut Datenstatus; Details im Eintrittsplan PDF.",
    pdfExec: "Zusammenfassung", pdfMethod: "Methodik & Gewichte", pdfSens: "Sensitivität der Gewichtung", pdfFind: "Zentrale Erkenntnisse", pdfData: "Datenstatus & Quellen", pdfWhy: "Begründung der Empfehlung", pdfNote: "Dieser Bericht trennt Quellen (veröffentlicht), Schätzungen (Rubrik/Prognose) und Annahmen (Modell)."
  },
  en: {
    kpiTitle: "Key metrics at a glance", kpiTarget: "Recommended market", kpiScore: "Overall score", kpiMargin: "Lead over #2", kpiRobust: "Robustness", kpiTime: "Timeframe", kpiBudget: "Budget", kpiBE: "Break-even",
    pts: "pts", robustVal: "{n} of {m} scenarios", tipScore: "Weighted average of the five criteria (0 to 100). Default: equal weights (20% each). An analyst rubric value, not a measured market size.", tipMargin: "Gap between rank 1 and rank 2. Below 3 points the ranking is tight and should be backed by additional information.", tipRobust: "In how many weighting scenarios (presets plus one criterion emphasised at 40%) does the recommended market stay at rank 1?",
    sTitle: "Scoring methodology & sensitivity", sSub: "How the score is built, and how stable is the ranking?",
    estimate: "Country values are an analyst rubric (estimate), not live measured market data. They are adjusted for your sector and company profile.",
    critTitle: "The five criteria", critCol: "Criterion", whatCol: "What it measures", wCol: "Weight", higher: "Higher means",
    def: { market: "Demand potential and growth of the target market for your industry.", competition: "Competitive headroom: how much room is left next to established players.", regulatory: "Effort for incorporation, approvals and taxes.", partner: "Availability of suitable distribution, joint venture and network partners.", investment: "Investment climate, incentives and access to capital." },
    hi: { market: "larger potential", competition: "less crowded", regulatory: "easier / faster", partner: "more suitable partners", investment: "more favourable climate" },
    formulaTitle: "Calculation", formula: "Overall score = Σ (weight × criterion score) ÷ Σ weights. Criterion score = country base rubric + sector fit + adjustment from your company profile (certifications, segments, sales channels, size, budget), capped to 0 to 100.",
    partsTitle: "How the values for {c} are built", base: "Base", sector: "Sector fit", company: "Profile", final: "Value",
    wTitle: "Test the weights yourself", wHint: "Sliders change the weights (normalised to 100%). The ranking updates instantly.", reset: "Reset", live: "Ranking with your weights", vsBase: "vs. default",
    presets: { equal: "Equal weights (default)", growth: "Growth focus", risk: "Risk / compliance", partner: "Partners & network", speed: "Speed to market" }, focus: "Focus {f} (40%)",
    sensTitle: "Sensitivity analysis", sensIntro: "Rank of each country under different weightings. Presets are illustrative scenarios, not market data.", scen: "Scenario",
    robustText: "{c} ranks #1 in {n} of {m} scenarios.", robustHigh: "The result is robust.", robustMid: "The result depends noticeably on the weighting; agree priorities first.", robustLow: "The result is weighting dependent; support the recommendation with additional analysis.",
    whyTitle: "Why this market?", whyLead: "{c} leads with {s}/100, {m} points ahead of {r}.", whyClose: "The gap is narrow, so the decision should not rest on the score alone.", whyClear: "The gap is clear.",
    leadsOn: "{c} is ahead on: {list}.", trailsOn: "{r} would be better on: {list}.", noTrade: "{r} is not better on any criterion.",
    opp: "Opportunities", risk: "Risks", barr: "Market entry barriers", trade: "Strategic trade off", next: "Practical next steps", derived: "derived from the scores",
    oppF: { market: "Large or growing demand pool", competition: "Competitive headroom next to incumbents", regulatory: "Comparatively straightforward market access", partner: "Strong partner ecosystem (distribution/JV viable)", investment: "Supportive investment climate" },
    barrF: { market: "Limited demand: validate volume before scaling.", competition: "Dense competition: clear niche differentiation required.", regulatory: "Approvals/licences may delay the start: file early.", partner: "Few suitable partners: evaluate 2 to 3 candidates in parallel.", investment: "Higher capital intensity: release budget in tranches." },
    st: { s1: "Win 1 to 2 pilot customers in {c} and measure demand (month 0 to 2). KPIs: offers, pilot revenue.", s2: "Clarify legal form and approvals: {lic}", s3: "Have taxes checked locally: corporate tax {tax}, VAT {vat}{date}.", s4: "Approach partners: {p}", s5: "Tie the {b} €M budget in tranches to the phase decision gates.", s6: "Review after 3 months: update assumptions and scores with real pilot data." },
    status: { sourced: "Sourced", estimate: "Estimate", assumption: "Assumption" },
    statusDef: { sourced: "Published statistic with named source and year. Not re verified live here: check the original source before decisions.", estimate: "Analyst judgement or forecast, not a measured quantity.", assumption: "Model assumption (e.g. financial model, timeline), simplified and illustrative." },
    legend: "Data status", srcLabel: "Source", asOf: "As of", noLink: "no direct link", linkNote: "Links go to the publisher's home page, not the individual page.",
    compTitle: "Competitive structure", cPlayer: "Player", cSeg: "Segment", cOverlap: "Overlap with your industry", ovD: "direct", ovA: "adjacent", ovL: "low", cGap: "Market gap / opportunity", cPos: "Recommended positioning", posNiche: "Specialised niche instead of broad competition: do not attack the large groups head on.", posPartner: "Enter through a local partner and use its customer access.", posDirect: "Direct entry with clear differentiation against the overlapping players.", heur: "Heuristic: matched by keywords, not a market share figure.", compNote: "Players' target customers and business models are not evidenced here; that would need a licensed market data source.",
    langNote: "",
    mapTitle: "Score map",
    mapSub: "Colour = overall score using the weights from the panel below.",
    mapNote: "Schematic illustration, not to scale.",
    mapLow: "lower",
    mapHigh: "higher",
    mapPick: "Click a country for details",
    rank: "Rank",
    mcTitle: "Monte Carlo robustness",
    mcIntro: "{n} random weightings (simulation with a fixed seed, reproducible). Shows how often each country wins.",
    mcLine: "{c} wins in {p}% of {n} weightings.",
    mcAvg: "Avg. rank",
    mcWin: "Wins",
    cmpTitle: "Scenario comparison",
    cmpSub: "Two markets or two budgets side by side.",
    duelTitle: "Country duel",
    budgetTitle: "Budget scenario",
    scA: "Scenario A",
    scB: "Scenario B",
    current: "Current",
    alt: "Alternative",
    budgetLbl: "Budget (€M)",
    rTarget: "Recommended market",
    rScore: "Overall score",
    rBE: "Break-even",
    rTime: "Timeframe",
    rStrat: "Entry mode",
    rTax: "Corporate tax",
    rVat: "VAT",
    duelVerdict: "{a} leads {b} on {n} of 5 criteria.",
    duelTie: "Both markets are level.",
    budgetSame: "At {b} €M the recommendation stays {c}.",
    budgetChange: "At {b} €M the recommendation changes from {c1} to {c2}.",
    scenNote: "Model calculation: score and break even follow the financial model's assumptions (illustrative).",
    memoBtn: "Decision memo (1 page)",
    memoTitle: "Decision memo",
    memoRec: "Recommendation",
    memoWhy: "Three reasons",
    memoRisks: "Three risks",
    memoCost: "Budget, time, return",
    memoNext: "Next steps",
    memoRank: "Ranking",
    memoAsk: "Decision: release a pilot phase in {c} with {b} €M, budget in tranches.",
    memoBasis: "Basis: analyst rubric (estimate) and sources as per data status; details in the entry plan PDF.",
    pdfExec: "Executive summary", pdfMethod: "Methodology & weights", pdfSens: "Weighting sensitivity", pdfFind: "Key findings", pdfData: "Data status & sources", pdfWhy: "Rationale for the recommendation", pdfNote: "This report separates sources (published), estimates (rubric/forecast) and assumptions (model)."
  },
  ar: {
    kpiTitle: "المؤشرات الرئيسية", kpiTarget: "السوق الموصى به", kpiScore: "التقييم الإجمالي", kpiMargin: "التقدّم على المركز الثاني", kpiRobust: "الثبات", kpiTime: "الإطار الزمني", kpiBudget: "الميزانية", kpiBE: "نقطة التعادل",
    pts: "نقطة", robustVal: "{n} من {m} سيناريوهات", tipScore: "المتوسط المرجّح للمعايير الخمسة (0 إلى 100). الافتراضي: أوزان متساوية (20% لكل معيار). قيمة تقديرية من منهج المحلل وليست حجم سوق مقاسًا.", tipMargin: "الفارق بين المركز الأول والثاني. أقل من 3 نقاط يعني ترتيبًا متقاربًا يحتاج إلى معلومات إضافية.", tipRobust: "في كم سيناريو للأوزان (إعدادات جاهزة مع تركيز 40% على معيار واحد) يبقى السوق الموصى به في المركز الأول؟",
    sTitle: "منهجية التقييم والحساسية", sSub: "كيف يُحسب التقييم، وما مدى ثبات الترتيب؟",
    estimate: "قيم الدول تقديرية من منهج المحلل وليست بيانات سوق مقاسة مباشرة. تُعدَّل حسب قطاعك وملف شركتك.",
    critTitle: "المعايير الخمسة", critCol: "المعيار", whatCol: "ما الذي يقيسه", wCol: "الوزن", higher: "الأعلى يعني",
    def: { market: "إمكانات الطلب ونمو السوق المستهدف لقطاعك.", competition: "هامش المنافسة: المساحة المتبقية بجانب اللاعبين الراسخين.", regulatory: "جهد التأسيس والتراخيص والضرائب.", partner: "توفر شركاء التوزيع والمشاريع المشتركة والشبكات المناسبين.", investment: "مناخ الاستثمار والحوافز والوصول إلى رأس المال." },
    hi: { market: "إمكانات أكبر", competition: "ازدحام أقل", regulatory: "أسهل / أسرع", partner: "شركاء مناسبون أكثر", investment: "مناخ أفضل" },
    formulaTitle: "طريقة الحساب", formula: "التقييم الإجمالي = مجموع (الوزن × قيمة المعيار) ÷ مجموع الأوزان. قيمة المعيار = المنهج الأساسي للدولة + ملاءمة القطاع + تعديل ملف شركتك (الشهادات والشرائح وقنوات البيع والحجم والميزانية) ضمن 0 إلى 100.",
    partsTitle: "كيف تتكوّن قيم {c}", base: "الأساس", sector: "ملاءمة القطاع", company: "الملف", final: "القيمة",
    wTitle: "جرّب الأوزان بنفسك", wHint: "تغيّر المنزلقات الأوزان (تُوحَّد إلى 100%). يتحدّث الترتيب فورًا.", reset: "إعادة ضبط", live: "الترتيب بأوزانك", vsBase: "مقارنة بالافتراضي",
    presets: { equal: "أوزان متساوية (افتراضي)", growth: "التركيز على النمو", risk: "المخاطر / الامتثال", partner: "الشركاء والشبكات", speed: "السرعة إلى السوق" }, focus: "التركيز على {f} (40%)",
    sensTitle: "تحليل الحساسية", sensIntro: "ترتيب كل دولة تحت أوزان مختلفة. الإعدادات الجاهزة سيناريوهات توضيحية وليست بيانات سوق.", scen: "السيناريو",
    robustText: "يحتل {c} المركز الأول في {n} من {m} سيناريوهات.", robustHigh: "النتيجة ثابتة.", robustMid: "تعتمد النتيجة بشكل ملحوظ على الأوزان؛ حدّد الأولويات أولًا.", robustLow: "النتيجة تعتمد على الأوزان؛ ادعم التوصية بتحليل إضافي.",
    whyTitle: "لماذا هذا السوق؟", whyLead: "يتصدر {c} بـ {s}/100، متقدمًا بـ {m} نقطة على {r}.", whyClose: "الفارق ضيق، فلا ينبغي أن يعتمد القرار على التقييم وحده.", whyClear: "الفارق واضح.",
    leadsOn: "يتفوق {c} في: {list}.", trailsOn: "سيكون {r} أفضل في: {list}.", noTrade: "{r} ليس أفضل في أي معيار.",
    opp: "الفرص", risk: "المخاطر", barr: "عوائق دخول السوق", trade: "المفاضلة الاستراتيجية", next: "الخطوات العملية التالية", derived: "مستنتج من التقييمات",
    oppF: { market: "حجم طلب كبير أو متنامٍ", competition: "هامش منافسة بجانب اللاعبين الراسخين", regulatory: "وصول أسهل نسبيًا إلى السوق", partner: "منظومة شركاء قوية (توزيع/مشروع مشترك ممكن)", investment: "مناخ استثماري داعم" },
    barrF: { market: "طلب محدود: تحقّق من الحجم قبل التوسع.", competition: "منافسة كثيفة: يلزم تمايز واضح في نيش محدد.", regulatory: "قد تؤخر التراخيص البداية: قدّم الطلبات مبكرًا.", partner: "شركاء مناسبون قليلون: قيّم ٢ إلى ٣ مرشحين بالتوازي.", investment: "كثافة رأسمالية أعلى: اصرف الميزانية على دفعات." },
    st: { s1: "اكسب عميلًا تجريبيًا أو اثنين في {c} وقِس الطلب (الشهر 0 إلى 2). المؤشرات: العروض والإيراد التجريبي.", s2: "وضّح الشكل القانوني والتراخيص: {lic}", s3: "اطلب مراجعة الضرائب محليًا: ضريبة الشركات {tax}، القيمة المضافة {vat}{date}.", s4: "تواصل مع الشركاء: {p}", s5: "اربط ميزانية {b} مليون يورو بنقاط القرار بين المراحل على دفعات.", s6: "مراجعة بعد 3 أشهر: حدّث الافتراضات والتقييمات ببيانات تجريبية حقيقية." },
    status: { sourced: "مصدر", estimate: "تقدير", assumption: "افتراض" },
    statusDef: { sourced: "إحصاءة منشورة بمصدر وسنة معلنين. لم يُعاد التحقق منها هنا مباشرة: راجع المصدر الأصلي قبل اتخاذ القرار.", estimate: "تقدير محلل أو توقع، وليس كمية مقاسة.", assumption: "افتراض نموذج (مثل النموذج المالي والجدول الزمني)، مبسّط وتوضيحي." },
    legend: "حالة البيانات", srcLabel: "المصدر", asOf: "التاريخ", noLink: "لا يوجد رابط مباشر", linkNote: "الروابط تؤدي إلى الصفحة الرئيسية للجهة الناشرة وليس إلى الصفحة المحددة.",
    compTitle: "هيكل المنافسة", cPlayer: "اللاعب", cSeg: "القطاع", cOverlap: "التداخل مع قطاعك", ovD: "مباشر", ovA: "مجاور", ovL: "منخفض", cGap: "فجوة السوق / الفرصة", cPos: "التموضع الموصى به", posNiche: "نيش متخصص بدل المنافسة الواسعة: لا تهاجم المجموعات الكبرى مباشرة.", posPartner: "ادخل عبر شريك محلي واستفد من وصوله إلى العملاء.", posDirect: "دخول مباشر مع تمايز واضح عن اللاعبين المتداخلين.", heur: "استدلال: مطابقة بالكلمات المفتاحية وليس حصة سوقية.", compNote: "العملاء المستهدفون ونماذج أعمال اللاعبين غير موثّقة هنا؛ يتطلب ذلك مصدر بيانات سوق مرخّصًا.",
    langNote: "",
    mapTitle: "خريطة التقييم",
    mapSub: "اللون = التقييم الإجمالي بحسب الأوزان في اللوحة أدناه.",
    mapNote: "رسم تخطيطي وليس بمقياس رسم.",
    mapLow: "أقل",
    mapHigh: "أعلى",
    mapPick: "انقر على دولة لعرض التفاصيل",
    rank: "الترتيب",
    mcTitle: "ثبات مونت كارلو",
    mcIntro: "{n} وزنًا عشوائيًا (محاكاة بنقطة بداية ثابتة وقابلة للتكرار). تُظهر عدد مرات فوز كل دولة.",
    mcLine: "تفوز {c} في {p}% من {n} توزيعًا للأوزان.",
    mcAvg: "متوسط الترتيب",
    mcWin: "الفوز",
    cmpTitle: "مقارنة السيناريوهات",
    cmpSub: "سوقان أو ميزانيتان جنبًا إلى جنب.",
    duelTitle: "مواجهة الدول",
    budgetTitle: "سيناريو الميزانية",
    scA: "السيناريو أ",
    scB: "السيناريو ب",
    current: "الحالي",
    alt: "البديل",
    budgetLbl: "الميزانية (مليون يورو)",
    rTarget: "السوق الموصى به",
    rScore: "التقييم الإجمالي",
    rBE: "نقطة التعادل",
    rTime: "الإطار الزمني",
    rStrat: "أسلوب الدخول",
    rTax: "ضريبة الشركات",
    rVat: "ضريبة القيمة المضافة",
    duelVerdict: "تتفوق {a} على {b} في {n} من 5 معايير.",
    duelTie: "السوقان متعادلان.",
    budgetSame: "عند {b} مليون يورو تبقى التوصية {c}.",
    budgetChange: "عند {b} مليون يورو تتغير التوصية من {c1} إلى {c2}.",
    scenNote: "حساب نموذجي: يتبع التقييم ونقطة التعادل افتراضات النموذج المالي (توضيحي).",
    memoBtn: "مذكرة القرار (صفحة واحدة)",
    memoTitle: "مذكرة القرار",
    memoRec: "التوصية",
    memoWhy: "ثلاثة أسباب",
    memoRisks: "ثلاث مخاطر",
    memoCost: "الميزانية والوقت والعائد",
    memoNext: "الخطوات التالية",
    memoRank: "الترتيب",
    memoAsk: "القرار: اعتماد مرحلة تجريبية في {c} بميزانية {b} مليون يورو على دفعات.",
    memoBasis: "الأساس: منهج المحلل (تقدير) والمصادر بحسب حالة البيانات؛ التفاصيل في ملف خطة الدخول.",
    pdfExec: "ملخص تنفيذي", pdfMethod: "المنهجية والأوزان", pdfSens: "حساسية الأوزان", pdfFind: "أهم النتائج", pdfData: "حالة البيانات والمصادر", pdfWhy: "مبررات التوصية", pdfNote: "يفصل هذا التقرير بين المصادر (منشورة) والتقديرات (منهج/توقع) والافتراضات (نموذج)."
  }
};
export const tx = lang => I[lang] || I.en;
const fmt = (s, o) => Object.keys(o).reduce((a, k) => a.split("{" + k + "}").join(o[k]), s);

/* ---------- pure analysis ---------- */
export const weighted = (s, w) => { const tot = w.reduce((a, b) => a + b, 0) || 1; return FACTORS.reduce((a, k, i) => a + s[k] * w[i], 0) / tot; };
export function rankWith(scores, w) { return Object.keys(scores).map(c => [c, weighted(scores[c], w)]).sort((a, b) => b[1] - a[1]); }
export function scenarios(scores, L, factorLabels) {
  const list = PRESETS.map(p => ({ id: p.id, name: L.presets[p.id], w: p.w }));
  FACTORS.forEach((k, i) => { const w = FACTORS.map((_, j) => (j === i ? 40 : 15)); list.push({ id: "f_" + k, name: fmt(L.focus, { f: factorLabels[i] }), w }); });
  return list.map(s => { const r = rankWith(scores, s.w); const rank = {}; r.forEach(([c], i) => { rank[c] = i + 1; }); return { ...s, rank, winner: r[0][0] }; });
}
export function monteCarlo(scores, n = 1000) {
  let a = 20261016; const rnd = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const cs = Object.keys(scores), wins = {}, rankSum = {}; cs.forEach(c => { wins[c] = 0; rankSum[c] = 0; });
  for (let i = 0; i < n; i++) {
    const w = FACTORS.map(() => -Math.log(1 - rnd()));
    const r = rankWith(scores, w); wins[r[0][0]]++; r.forEach(([c], j) => { rankSum[c] += j + 1; });
  }
  const out = cs.map(c => ({ c, share: Math.round(wins[c] / n * 1000) / 10, avg: Math.round(rankSum[c] / n * 10) / 10 })).sort((x, y) => y.share - x.share || x.avg - y.avg);
  return { n, rows: out };
}
const listJoin = a => a.join(", ");
export function analyze(rec, t, lang, data, factorLabels) {
  const L = tx(lang), scores = rec.scores, target = rec.rec.targetMarket;
  const ranked = rankWith(scores, PRESETS[0].w).map(([c]) => c);
  const second = ranked.find(c => c !== target) || target;
  const margin = Math.round((scores[target].overall - scores[second].overall) * 10) / 10;
  const sc = scenarios(scores, L, factorLabels);
  const holds = sc.filter(s => s.winner === target).length;
  const mc = monteCarlo(scores);
  const robustness = { n: holds, m: sc.length, level: holds / sc.length >= 0.8 ? "robustHigh" : holds / sc.length >= 0.5 ? "robustMid" : "robustLow" };
  const diff = FACTORS.map((k, i) => ({ k, label: factorLabels[i], d: scores[target][k] - scores[second][k] }));
  const lead = diff.filter(x => x.d > 0).sort((a, b) => b.d - a.d).map(x => `${x.label} (+${Math.round(x.d)})`);
  const trail = diff.filter(x => x.d < 0).sort((a, b) => a.d - b.d).map(x => `${x.label} (${Math.round(x.d)})`);
  const byScore = FACTORS.map((k, i) => ({ k, label: factorLabels[i], v: scores[target][k] })).sort((a, b) => b.v - a.v);
  const opp = byScore.slice(0, 2).map(x => ({ label: x.label, text: L.oppF[x.k], v: Math.round(x.v) }));
  const barr = byScore.slice(-2).reverse().map(x => ({ label: x.label, text: L.barrF[x.k], v: Math.round(x.v) }));
  const mo = (data.MARKET_OPPORTUNITY || {})[target] || {}, ca = (data.COMPETITOR_ANALYSIS || {})[target] || {}, rg = (data.REGULATORY_CHECK || {})[target] || {};
  const risks = (rec.rec.risks || []).map(k => t.riskText[k]).filter(Boolean);
  const yr = (rg.source || "").match(/20\d\d(?:[\/––]\d{2,4})?/);
  const steps = [
    fmt(L.st.s1, { c: target }),
    rg.licensing ? fmt(L.st.s2, { lic: rg.licensing }) : null,
    rg.corporateTax ? fmt(L.st.s3, { tax: rg.corporateTax, vat: rg.vat || "n/a", date: yr ? ` (${L.asOf} ${yr[0]})` : "" }) : null,
    t.partnersText && t.partnersText[rec.rec.prioritySector] ? fmt(L.st.s4, { p: t.partnersText[rec.rec.prioritySector] }) : null,
    fmt(L.st.s5, { b: rec.input.budget }),
    L.st.s6
  ].filter(Boolean);
  return {
    L, target, second, ranked, margin, close: margin < 3, scenarios: sc, robustness,
    lead: lead.length ? fmt(L.leadsOn, { c: target, list: listJoin(lead) }) : "",
    trade: trail.length ? fmt(L.trailsOn, { r: second, list: listJoin(trail) }) : fmt(L.noTrade, { r: second }),
    whyLead: fmt(L.whyLead, { c: target, s: scores[target].overall, m: margin, r: second }),
    robustText: fmt(L.robustText, { c: target, n: holds, m: sc.length }) + " " + L[robustness.level],
    mc, mcText: fmt(L.mcLine, { c: target, p: (mc.rows.find(r => r.c === target) || { share: 0 }).share, n: mc.n }),
    opp, barr, risks, steps, driver: mo.drivers || [], gap: ca.gap || ""
  };
}

/* ---------- source links ---------- */
const PUB = [
  [/World Bank/i, "World Bank", "worldbank.org"], [/Trading Economics/i, "Trading Economics", "tradingeconomics.com"], [/Deloitte/i, "Deloitte", "deloitte.com"],
  [/Dubai Chamber/i, "Dubai Chamber of Commerce", "dubaichamber.com"], [/Euromonitor/i, "Euromonitor", "euromonitor.com"], [/ResearchAndMarkets/i, "ResearchAndMarkets", "researchandmarkets.com"],
  [/MISA/i, "MISA", "misa.gov.sa"], [/Vision 2030/i, "Vision 2030", "vision2030.gov.sa"], [/FCSC/i, "FCSC", "fcsc.gov.ae"], [/GASTAT/i, "GASTAT", "stats.gov.sa"], [/PSA\b/, "PSA", "psa.gov.qa"],
  [/UAE Ministry of Finance/i, "UAE Ministry of Finance", "mof.gov.ae"], [/Allianz Trade/i, "Allianz Trade", "allianz-trade.com"], [/KPMG/i, "KPMG", "kpmg.com"], [/Gulf News/i, "Gulf News", "gulfnews.com"],
  [/trade\.gov|US Commercial Guide/i, "trade.gov", "trade.gov"], [/Wise/, "Wise", "wise.com"], [/HMRC/i, "HMRC", "gov.uk/government/organisations/hm-revenue-customs"], [/business\.gov\.uk/i, "business.gov.uk", "business.gov.uk"],
  [/UK D(?:BT|epartment for Business)/i, "UK Department for Business & Trade", "gov.uk/government/organisations/department-for-business-and-trade"], [/Destatis/i, "Destatis", "destatis.de"], [/INSEE/i, "INSEE", "insee.fr"], [/ISTAT/i, "ISTAT", "istat.it"],
  [/\bINE\b/, "INE", "ine.es"], [/\bCBS\b/, "CBS", "cbs.nl"], [/Agencia Tributaria/i, "Agencia Tributaria", "agenciatributaria.es"], [/Belastingdienst/i, "Belastingdienst", "belastingdienst.nl"],
  [/Bundeszentralamt/i, "BZSt", "bzst.de"], [/Direction Générale des Finances/i, "DGFiP", "impots.gouv.fr"], [/Stripe Tax/i, "Stripe Tax", "stripe.com"], [/Forrester/i, "Forrester", "forrester.com"]
];
export function parseSource(src) {
  const s = String(src || ""); const links = []; PUB.forEach(([re, name, url]) => { if (re.test(s) && !links.find(l => l.url === url)) links.push({ name, url }); });
  const m = s.match(/(?:März\s)?20\d\d(?:[\/––-]\d{2,4})?/g);
  return { text: s, links, asOf: m ? m[m.length - 1] : "" };
}
export const kindOf = src => { const p = parseSource(src); return "sourced"; };

/* ---------- UI atoms ---------- */
const KCOL = { sourced: "#3E9B7A", estimate: "#C9A24B", assumption: "#8A93A6" };
export function Tip({ text, th }) {
  const [o, setO] = useState(false);
  return <span style={{ position: "relative", display: "inline-flex", alignSelf: "center", flexShrink: 0, marginInlineStart: 4 }} onMouseEnter={() => setO(true)} onMouseLeave={() => setO(false)}>
    <button type="button" aria-label={text} onClick={() => setO(v => !v)} onFocus={() => setO(true)} onBlur={() => setO(false)} style={{ width: 24, height: 24, margin: "-4px", padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "help", flexShrink: 0, minHeight: 0, color: th.subtleInk }}><span aria-hidden="true" style={{ width: 16, height: 16, borderRadius: 2, border: `1px solid ${th.subtleInk}`, fontSize: 10, lineHeight: "14px", display: "block", textAlign: "center" }}>i</span></button>
    {o && <span role="tooltip" style={{ position: "absolute", zIndex: 20, insetInlineStart: 0, top: 26, width: 250, padding: "8px 10px", borderRadius: 8, background: th.dark ? "#14161C" : "#fff", color: th.ink, border: `1px solid ${th.lineColor}`, fontSize: 11.5, lineHeight: 1.5, fontWeight: 400, boxShadow: "0 10px 30px rgba(0,0,0,.4)", textAlign: "start" }}>{text}</span>}
  </span>;
}
export function Status({ kind, lang, th }) {
  const L = tx(lang);
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}><span style={{ fontSize: 9.5, padding: "2px 7px", borderRadius: 2, background: th.dark ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.05)", color: th.ink, fontWeight: 600, whiteSpace: "nowrap" }}>{L.status[kind]}</span><Tip th={th} text={L.statusDef[kind]} /></span>;
}
export function StatusLegend({ lang, th }) {
  const L = tx(lang);
  return <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", fontSize: 11, color: th.subtleInk }}><span>{L.legend}:</span>{["sourced", "estimate", "assumption"].map(k => <Status key={k} kind={k} lang={lang} th={th} />)}</div>;
}
export function SourceLine({ source, lang, th, kind }) {
  const L = tx(lang), p = parseSource(source);
  return <p style={{ color: th.subtleInk, fontSize: 10, margin: "6px 0 0", display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
    <Status kind={kind || "sourced"} lang={lang} th={th} />
    <span>{L.srcLabel}: {p.text}</span>
    {p.links.map(l => <a key={l.url} href={`https://${l.url}`} target="_blank" rel="noopener noreferrer" style={{ color: th.accent, textDecoration: "underline", textUnderlineOffset: 2 }}>{l.name} ↗</a>)}
  </p>;
}

const card = th => ({ background: th.cardBg, border: `1px solid ${th.lineColor}`, borderRadius: 10, padding: 24, marginBottom: 32 });
const h3 = th => ({ fontFamily: th.fontDisplay, color: th.ink, fontSize: 16, fontWeight: 600, margin: 0 });
const bar = (v, th, col) => <div style={{ flex: 1, height: 6, borderRadius: 1, background: th.lineColor, overflow: "hidden" }}><div style={{ width: `${Math.max(0, Math.min(100, v))}%`, height: "100%", background: col || th.accent }} /></div>;

/* ---------- KPI strip ---------- */
export function KpiStrip({ A, rec, th, lang, t, getTimelineLabel, breakEven }) {
  const L = A.L;
  const items = [
    [L.kpiTarget, A.target, null, th.accent], [L.kpiScore, `${rec.scores[A.target].overall}/100`, L.tipScore], [L.kpiMargin, `${A.margin} ${L.pts}`, L.tipMargin, A.close ? th.neg : null],
    [L.kpiRobust, fmt(L.robustVal, { n: A.robustness.n, m: A.robustness.m }), L.tipRobust], [L.kpiTime, getTimelineLabel(rec.rec.timelineMonths, t)], [L.kpiBudget, `${rec.input.budget} ${t.costEurLabel}`], [L.kpiBE, breakEven]
  ];
  return <section aria-label={L.kpiTitle} data-testid="kpi-strip" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginBottom: 28 }}>
    {items.map(([k, v, tip, col], i) => <div key={i} style={{ padding: "12px 14px", borderRadius: 10, border: `1px solid ${i === 0 ? th.accent : th.lineColor}`, background: th.cardBg }}>
      <div style={{ color: th.subtleInk, fontSize: 11, display: "flex", alignItems: "center" }}>{k}{tip && <Tip text={tip} th={th} />}</div>
      <div style={{ color: col || th.ink, fontFamily: th.fontDisplay, fontSize: i === 0 ? 22 : 18, fontWeight: 600, marginTop: 4 }}>{v}</div>
    </div>)}
  </section>;
}

/* ---------- why / recommendation ---------- */
export function WhyPanel({ A, th, lang }) {
  const L = A.L;
  const list = (title, rows, col) => <div style={{ flex: "1 1 240px", minWidth: 0 }}>
    <p style={{ color: col, fontSize: 12, fontWeight: 700, margin: "0 0 6px" }}>{title}</p>
    <ul style={{ margin: 0, paddingInlineStart: 18, listStyle: "disc", color: th.ink, fontSize: 12.5, lineHeight: 1.6 }}>{rows.map((r, i) => <li key={i}>{r}</li>)}</ul>
  </div>;
  return <section data-testid="why-panel" style={card(th)}>
    <h3 style={h3(th)}>{L.whyTitle}</h3>
    <p style={{ color: th.ink, fontSize: 14, margin: "10px 0 4px", fontWeight: 600 }}>{A.whyLead}</p>
    <p style={{ color: A.close ? th.neg : th.subtleInk, fontSize: 12.5, margin: "0 0 6px" }}>{A.close ? L.whyClose : L.whyClear} {A.robustText} {A.mcText}</p>
    {A.lead && <p style={{ color: th.ink, fontSize: 12.5, margin: "0 0 4px" }}>{A.lead}</p>}
    <p style={{ color: th.ink, fontSize: 12.5, margin: "0 0 16px" }}><strong>{L.trade}:</strong> {A.trade}</p>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginBottom: 14 }}>
      {list(`${L.opp} (${L.derived})`, [...A.opp.map(o => `${o.label} ${o.v}: ${o.text}`), ...A.driver], th.pos)}
      {list(`${L.barr} (${L.derived})`, A.barr.map(o => `${o.label} ${o.v}: ${o.text}`), th.neg)}
      {list(L.risk, A.risks.length ? A.risks : ["n/a"], th.neg)}
    </div>
    <p style={{ color: th.accent, fontSize: 12, fontWeight: 700, margin: "0 0 6px" }}>{L.next}</p>
    <ol style={{ margin: 0, paddingInlineStart: 20, listStyle: "decimal", color: th.ink, fontSize: 12.5, lineHeight: 1.65 }}>{A.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
    {L.langNote && <p style={{ color: th.subtleInk, fontSize: 10.5, margin: "10px 0 0" }}>{L.langNote}</p>}
  </section>;
}

/* ---------- scoring panel ---------- */
export function ScoringPanel({ rec, A, th, lang, factorLabels, parts, w, setW }) {
  const L = A.L, scores = rec.scores, countries = Object.keys(scores);
  const tot = w.reduce((a, b) => a + b, 0) || 1;
  const live = rankWith(scores, w), baseRank = {}; rankWith(scores, PRESETS[0].w).forEach(([c], i) => { baseRank[c] = i + 1; });
  const target = A.target, tp = parts && parts[target];
  const th2 = { padding: "6px 8px", textAlign: "start", fontSize: 11, color: th.subtleInk, fontWeight: 500, borderBottom: `1px solid ${th.lineColor}` };
  const td = { padding: "6px 8px", fontSize: 12, color: th.ink, borderBottom: `1px solid ${th.lineColor}`, verticalAlign: "top" };
  return <section data-testid="scoring-panel" style={card(th)}>
    <h3 style={h3(th)}>{L.sTitle}</h3>
    <p style={{ color: th.subtleInk, fontSize: 11.5, margin: "4px 0 10px" }}>{L.sSub}</p>
    <p style={{ margin: "0 0 14px", display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12, color: th.ink }}><Status kind="estimate" lang={lang} th={th} /><span>{L.estimate}</span></p>

    <p style={{ color: th.ink, fontSize: 13, fontWeight: 600, margin: "0 0 6px" }}>{L.critTitle}</p>
    <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
      <thead><tr><th style={th2}>{L.critCol}</th><th style={th2}>{L.whatCol}</th><th style={th2}>{L.higher}</th><th style={th2}>{L.wCol}</th><th style={th2}>{target}</th></tr></thead>
      <tbody>{FACTORS.map((k, i) => <tr key={k}><td style={{ ...td, fontWeight: 600 }}>{factorLabels[i]}</td><td style={td}>{L.def[k]}</td><td style={td}>{L.hi[k]}</td><td style={td}>{Math.round(w[i] / tot * 100)}%</td><td style={td}><div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 90 }}>{bar(scores[target][k], th)}<span>{Math.round(scores[target][k])}</span></div></td></tr>)}</tbody>
    </table></div>

    <p style={{ color: th.ink, fontSize: 13, fontWeight: 600, margin: "16px 0 4px" }}>{L.formulaTitle}</p>
    <p style={{ color: th.subtleInk, fontSize: 12, lineHeight: 1.6, margin: 0 }}>{L.formula}</p>

    {tp && <><p style={{ color: th.ink, fontSize: 13, fontWeight: 600, margin: "16px 0 6px" }}>{fmt(L.partsTitle, { c: target })}</p>
      <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 420 }}>
        <thead><tr><th style={th2}>{L.critCol}</th><th style={th2}>{L.base}</th><th style={th2}>{L.sector}</th><th style={th2}>{L.company}</th><th style={th2}>{L.final}</th></tr></thead>
        <tbody>{FACTORS.map((k, i) => <tr key={k}><td style={td}>{factorLabels[i]}</td><td style={td}>{tp[k].base}</td><td style={td}>{tp[k].sector > 0 ? "+" : ""}{tp[k].sector}</td><td style={td}>{tp[k].company > 0 ? "+" : ""}{tp[k].company}</td><td style={{ ...td, fontWeight: 700 }}>{Math.round(scores[target][k])}</td></tr>)}</tbody>
      </table></div></>}

    <p style={{ color: th.ink, fontSize: 13, fontWeight: 600, margin: "18px 0 2px" }}>{L.wTitle}</p>
    <p style={{ color: th.subtleInk, fontSize: 11.5, margin: "0 0 8px" }}>{L.wHint}</p>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
      {PRESETS.map(p => <button key={p.id} type="button" onClick={() => setW(p.w)} style={{ fontSize: 11.5, padding: "5px 12px", borderRadius: 3, border: `1px solid ${JSON.stringify(w) === JSON.stringify(p.w) ? th.accent : th.lineColor}`, color: JSON.stringify(w) === JSON.stringify(p.w) ? th.accent : th.subtleInk, minHeight: 32 }}>{L.presets[p.id]}</button>)}
      <button type="button" onClick={() => setW(PRESETS[0].w)} style={{ fontSize: 11.5, padding: "5px 12px", color: th.subtleInk, textDecoration: "underline" }}>{L.reset}</button>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "6px 20px", marginBottom: 12 }}>
      {FACTORS.map((k, i) => <label key={k} style={{ fontSize: 11.5, color: th.subtleInk }}>{factorLabels[i]} <strong style={{ color: th.ink }}>{Math.round(w[i] / tot * 100)}%</strong>
        <input type="range" min="0" max="100" value={w[i]} aria-label={`${factorLabels[i]} ${L.wCol}`} onChange={e => { const v = Number(e.target.value); setW(w.map((x, j) => j === i ? v : x)); }} style={{ width: "100%", accentColor: th.accent }} /></label>)}
    </div>
    <p style={{ color: th.ink, fontSize: 12, fontWeight: 600, margin: "0 0 4px" }}>{L.live}</p>
    <div data-testid="live-ranking">{live.map(([c, v], i) => { const d = baseRank[c] - (i + 1); return <div key={c} style={{ display: "flex", alignItems: "center", gap: 10, padding: "3px 0", fontSize: 12.5, color: th.ink }}>
      <span style={{ width: 18, color: th.subtleInk }}>{i + 1}</span><span style={{ width: 80, fontWeight: i === 0 ? 700 : 400 }}>{c}</span>{bar(v, th, i === 0 ? th.accent : th.pos)}<span style={{ width: 42, textAlign: "end" }}>{Math.round(v * 10) / 10}</span>
      <span style={{ width: 70, fontSize: 11, color: d > 0 ? th.pos : d < 0 ? th.neg : th.subtleInk }} dir="ltr">{d > 0 ? "▲ +" + d : d < 0 ? "▼ " + d : "n/a"} {d !== 0 ? "" : ""}</span></div>; })}</div>
    <p style={{ color: th.subtleInk, fontSize: 10.5, margin: "2px 0 0" }}>▲▼ {L.vsBase}</p>

    <p style={{ color: th.ink, fontSize: 13, fontWeight: 600, margin: "20px 0 2px" }}>{L.sensTitle}</p>
    <p style={{ color: th.subtleInk, fontSize: 11.5, margin: "0 0 8px" }}>{L.sensIntro}</p>
    <div style={{ overflowX: "auto" }}><table data-testid="sens-table" style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
      <thead><tr><th style={th2}>{L.scen}</th>{countries.map(c => <th key={c} style={{ ...th2, textAlign: "center" }}>{c}</th>)}</tr></thead>
      <tbody>{A.scenarios.map(s => <tr key={s.id}><td style={td}>{s.name}</td>{countries.map(c => <td key={c} style={{ ...td, textAlign: "center", fontWeight: s.rank[c] === 1 ? 700 : 400, color: s.rank[c] === 1 ? th.accent : th.ink }}>{s.rank[c]}</td>)}</tr>)}</tbody>
    </table></div>
    <p style={{ color: A.robustness.level === "robustHigh" ? th.pos : th.neg, fontSize: 12.5, fontWeight: 600, margin: "10px 0 0" }}>{A.robustText}</p>

    <p style={{ color: th.ink, fontSize: 13, fontWeight: 600, margin: "22px 0 2px", display: "flex", alignItems: "center" }}>{L.mcTitle} <Status kind="estimate" lang={lang} th={th} /></p>
    <p style={{ color: th.subtleInk, fontSize: 11.5, margin: "0 0 8px" }}>{fmt(L.mcIntro, { n: A.mc.n })}</p>
    <div data-testid="mc-block">{A.mc.rows.map(r => <div key={r.c} style={{ display: "flex", alignItems: "center", gap: 10, padding: "3px 0", fontSize: 12.5, color: th.ink }}>
      <span style={{ width: 86, fontWeight: r.c === target ? 700 : 400 }}>{r.c}</span>{bar(r.share, th, r.c === target ? th.accent : th.pos)}<span style={{ width: 52, textAlign: "end" }} dir="ltr">{r.share} %</span><span style={{ width: 90, fontSize: 11, color: th.subtleInk, textAlign: "end" }} dir="ltr">{L.mcAvg} {r.avg}</span></div>)}</div>
    <p style={{ color: th.ink, fontSize: 12.5, fontWeight: 600, margin: "8px 0 0" }}>{A.mcText}</p>
  </section>;
}

/* ---------- competitor structure ---------- */
const OVERLAP = { medtech: /health|med|pharma|hospital/i, manufacturing: /industr|chem|manufact|auto/i, software: /software|digital|telecom|it\b|tech/i, consumer: /retail|consumer|food|e-?commerce|duty/i, energy: /energy|oil|power|aramco/i, finance: /bank|financ|insur|islamic/i, logistics: /logist|port|freight|dp world|aviation/i, realEstate: /real estate|immobil|property|emaar/i, sovereignInvestment: /invest|sovereign|fund/i, halalFood: /food|halal|retail/i, islamicFinance: /bank|financ|islamic/i, renewableEnergy: /energy|power|renew/i, luxuryRetail: /retail|luxur|fashion/i };
export function CompetitorBlock({ rec, A, th, lang, data, t }) {
  const L = A.L, ca = (data.COMPETITOR_ANALYSIS || {})[A.target]; if (!ca) return null;
  const re = OVERLAP[rec.rec.prioritySector] || OVERLAP[rec.input.industry];
  const rows = (ca.players || []).map(p => { const m = p.match(/^(.*?)\s*\((.*)\)\s*$/); const name = m ? m[1] : p, seg = m ? m[2] : "n/a"; const hit = re && re.test(p); const adj = !hit && re && /./.test(seg) && false; return { name, seg, ov: hit ? L.ovD : L.ovL, hit }; });
  const pos = rows.some(r => r.hit) ? (rec.rec.entryStrategy === "distributorPartner" ? L.posPartner : L.posDirect) : L.posNiche;
  const td = { padding: "6px 8px", fontSize: 12, color: th.ink, borderBottom: `1px solid ${th.lineColor}` };
  return <section data-testid="competitor-block" style={card(th)}>
    <h3 style={h3(th)}>{L.compTitle}: {A.target}</h3>
    <div style={{ overflowX: "auto", marginTop: 10 }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 420 }}>
      <thead><tr>{[L.cPlayer, L.cSeg, L.cOverlap].map(h => <th key={h} style={{ ...td, color: th.subtleInk, fontWeight: 500, fontSize: 11, textAlign: "start" }}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}><td style={{ ...td, fontWeight: 600 }}>{r.name}</td><td style={td}>{r.seg}</td><td style={{ ...td, color: r.hit ? th.neg : th.subtleInk }}>{r.ov}</td></tr>)}</tbody>
    </table></div>
    <p style={{ color: th.subtleInk, fontSize: 10.5, margin: "6px 0 10px" }}>{L.heur} {L.compNote}</p>
    <p style={{ color: th.ink, fontSize: 12.5, margin: "0 0 6px" }}><strong>{L.cGap}:</strong> {ca.gap}</p>
    <p style={{ color: th.ink, fontSize: 12.5, margin: 0 }}><strong>{L.cPos}:</strong> {pos} <Status kind="estimate" lang={lang} th={th} /></p>
  </section>;
}

/* ---------- print sections (light theme) ---------- */
export function IntelPrint({ A, rec, lang, factorLabels, data, parts, t }) {
  const L = A.L, scores = rec.scores, countries = Object.keys(scores), target = A.target;
  const th = { textAlign: "start", padding: "4px 6px", borderBottom: "1.5px solid #111", fontSize: 9.5 };
  const td = { padding: "4px 6px", borderBottom: "1px solid #e3e3e3", verticalAlign: "top", fontSize: 10 };
  const H = ({ children }) => <h3 style={{ fontSize: 14.5, fontWeight: 700, borderBottom: "1.5px solid #111", paddingBottom: 4, margin: "0 0 10px" }}>{children}</h3>;
  const tp = parts && parts[target];
  const srcs = [];
  const add = (label, s, kind) => { if (s) srcs.push({ label, s, kind }); };
  const fu = (data.COUNTRY_FUNDAMENTALS || {})[target] || {}, rg = (data.REGULATORY_CHECK || {})[target] || {}, mo = (data.MARKET_OPPORTUNITY || {})[target] || {};
  add("Macro", fu.source); add(L.pdfData && "Regulatory", rg.source); add("Market", mo.source);
  return <>
    <section style={{ marginTop: 20 }}><H>{L.pdfWhy}</H>
      <p style={{ margin: "0 0 4px", fontWeight: 600 }}>{A.whyLead}</p>
      <p style={{ margin: "0 0 4px" }}>{A.close ? L.whyClose : L.whyClear} {A.robustText}</p>
      {A.lead && <p style={{ margin: "0 0 4px" }}>{A.lead}</p>}
      <p style={{ margin: 0 }}><strong>{L.trade}:</strong> {A.trade}</p>
    </section>
    <section style={{ marginTop: 20, breakBefore: "page" }}><H>{L.pdfMethod}</H>
      <p style={{ margin: "0 0 6px" }}>{L.estimate}</p>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8 }}>
        <thead><tr><th style={th}>{L.critCol}</th><th style={th}>{L.whatCol}</th><th style={th}>{L.higher}</th><th style={th}>{L.wCol}</th></tr></thead>
        <tbody>{FACTORS.map((k, i) => <tr key={k} style={{ breakInside: "avoid" }}><td style={{ ...td, fontWeight: 600 }}>{factorLabels[i]}</td><td style={td}>{L.def[k]}</td><td style={td}>{L.hi[k]}</td><td style={td}>20%</td></tr>)}</tbody>
      </table>
      <p style={{ margin: "0 0 8px", fontSize: 9.5, color: "#444" }}>{L.formula}</p>
      {tp && <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr><th style={th}>{fmt(L.partsTitle, { c: target })}</th><th style={th}>{L.base}</th><th style={th}>{L.sector}</th><th style={th}>{L.company}</th><th style={th}>{L.final}</th></tr></thead>
        <tbody>{FACTORS.map((k, i) => <tr key={k} style={{ breakInside: "avoid" }}><td style={td}>{factorLabels[i]}</td><td style={td}>{tp[k].base}</td><td style={td}>{tp[k].sector > 0 ? "+" : ""}{tp[k].sector}</td><td style={td}>{tp[k].company > 0 ? "+" : ""}{tp[k].company}</td><td style={{ ...td, fontWeight: 700 }}>{Math.round(scores[target][k])}</td></tr>)}</tbody>
      </table>}
    </section>
    <section style={{ marginTop: 20 }}><H>{L.pdfSens}</H>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 6 }}>
        <thead><tr><th style={th}>{L.scen}</th>{countries.map(c => <th key={c} style={th}>{c}</th>)}</tr></thead>
        <tbody>{A.scenarios.map(s => <tr key={s.id} style={{ breakInside: "avoid" }}><td style={td}>{s.name}</td>{countries.map(c => <td key={c} style={{ ...td, fontWeight: s.rank[c] === 1 ? 700 : 400, background: s.rank[c] === 1 ? "#f4ecd8" : "transparent", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>{s.rank[c]}</td>)}</tr>)}</tbody>
      </table>
      <p style={{ margin: 0, fontWeight: 600 }}>{A.robustText} {A.mcText}</p>
    </section>
    <section style={{ marginTop: 20 }}><H>{L.pdfFind}</H>
      <div style={{ display: "flex", gap: 14 }}>
        <div style={{ flex: 1 }}><p style={{ fontWeight: 700, margin: "0 0 3px" }}>{L.opp}</p><ul style={{ margin: 0, paddingInlineStart: 16, listStyle: "disc" }}>{[...A.opp.map(o => `${o.label} ${o.v}: ${o.text}`), ...A.driver].map((x, i) => <li key={i}>{x}</li>)}</ul></div>
        <div style={{ flex: 1 }}><p style={{ fontWeight: 700, margin: "0 0 3px" }}>{L.barr}</p><ul style={{ margin: 0, paddingInlineStart: 16, listStyle: "disc" }}>{A.barr.map((o, i) => <li key={i}>{o.label} {o.v}: {o.text}</li>)}</ul></div>
      </div>
      {A.gap && <p style={{ margin: "8px 0 0" }}><strong>{L.cGap}:</strong> {A.gap}</p>}
    </section>
    <section style={{ marginTop: 20 }}><H>{L.next}</H>
      <ol style={{ margin: 0, paddingInlineStart: 18, listStyle: "decimal" }}>{A.steps.map((s, i) => <li key={i} style={{ marginBottom: 2 }}>{s}</li>)}</ol>
    </section>
    <section style={{ marginTop: 20 }}><H>{L.pdfData}</H>
      <p style={{ margin: "0 0 6px", fontSize: 9.5 }}>{L.pdfNote}</p>
      <table style={{ width: "100%", borderCollapse: "collapse" }}><tbody>
        {[["estimate", L.sTitle, L.estimate], ...srcs.map(x => { const p = parseSource(x.s); return ["sourced", x.label, `${p.text}${p.links.length ? ": " + p.links.map(l => l.url).join(", ") : ""}`]; }), ["assumption", t.reportSectionFinancials || "Financial", L.statusDef.assumption]].map(([k, a, b], i) => <tr key={i} style={{ breakInside: "avoid" }}><td style={{ ...td, whiteSpace: "nowrap", fontWeight: 700, color: KCOL[k] }}>{L.status[k]}</td><td style={{ ...td, fontWeight: 600 }}>{a}</td><td style={td}>{b}</td></tr>)}
      </tbody></table>
      <p style={{ fontSize: 8.5, color: "#777", marginTop: 4 }}>{L.linkNote}</p>
    </section>
  </>;
}


/* ---------- score map ---------- */
const mixHex = (a, b, t) => { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); const x = p(a), y = p(b); return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
export function MapPanel({ rec, A, th, lang, factorLabels, region, w }) {
  const L = A.L, g = GEO[region]; const [sel, setSel] = useState(null);
  if (!g) return null;
  const live = rankWith(rec.scores, w), val = Object.fromEntries(live), rk = Object.fromEntries(live.map(([c], i) => [c, i + 1]));
  const vs = live.map(x => x[1]), lo = Math.min(...vs), hi = Math.max(...vs), span = hi - lo || 1;
  const cur = sel || A.target, sc = rec.scores[cur];
  const base = th.dark ? "#1E2530" : "#E4E1D8", ctx = th.dark ? "#141922" : "#EFEDE6", stroke = th.dark ? "#0B0D12" : "#fff";
  return <section data-testid="map-panel" style={card(th)}>
    <h3 style={h3(th)}>{L.mapTitle}</h3>
    <p style={{ color: th.subtleInk, fontSize: 11.5, margin: "4px 0 12px" }}>{L.mapSub} {L.mapPick}.</p>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-start" }}>
      <svg viewBox={`0 0 ${g.w} ${g.h}`} role="img" aria-label={L.mapTitle} style={{ flex: "1 1 340px", maxWidth: 560, background: th.dark ? "#0E1219" : "#F6F4EE", border: `1px solid ${th.lineColor}`, borderRadius: 4 }}>
        {g.ctx.map((d, i) => <path key={i} d={d} fill={ctx} stroke={th.lineColor} strokeWidth="1" />)}
        {Object.entries(g.countries).filter(([n]) => val[n] !== undefined).map(([n, c]) => { const t = (val[n] - lo) / span; const on = n === cur;
          return <g key={n} data-testid={"map-" + n} tabIndex={0} role="button" aria-label={`${n} ${Math.round(val[n] * 10) / 10}`} style={{ cursor: "pointer", outline: "none" }} onClick={() => setSel(n)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") setSel(n); }}>
            <path d={c.d} fill={mixHex(base, th.accent, 0.18 + 0.82 * t)} stroke={on ? th.ink : stroke} strokeWidth={on ? 2.2 : 1.2} strokeLinejoin="round" />
            {n === "Bahrain" && <circle cx={c.c[0]} cy={c.c[1]} r="9" fill={mixHex(base, th.accent, 0.18 + 0.82 * t)} stroke={on ? th.ink : stroke} strokeWidth={on ? 2.2 : 1.2} />}
            <text x={c.c[0]} y={c.c[1] - 2} textAnchor="middle" fontSize={["Qatar", "Bahrain", "Kuwait"].includes(n) ? 9 : 13} fontWeight="600" fill={t > 0.55 ? "#0B0D12" : th.ink} style={{ pointerEvents: "none" }}>{["Qatar", "Bahrain"].includes(n) ? "" : n}</text>
            <text x={c.c[0]} y={c.c[1] + 13} textAnchor="middle" fontSize={["Qatar", "Bahrain", "Kuwait"].includes(n) ? 9 : 12} fill={t > 0.55 ? "#0B0D12" : th.subtleInk} style={{ pointerEvents: "none" }}>{["Qatar", "Bahrain"].includes(n) ? "" : Math.round(val[n])}</text>
          </g>; })}
      </svg>
      <div style={{ flex: "1 1 220px", minWidth: 0 }}>
        <p style={{ color: th.ink, fontFamily: th.fontDisplay, fontSize: 18, fontWeight: 600, margin: 0 }}>{cur} <span style={{ color: th.subtleInk, fontSize: 12, fontWeight: 400 }}>· {L.rank} {rk[cur]} · {Math.round(val[cur] * 10) / 10}</span></p>
        <div style={{ margin: "10px 0" }}>{FACTORS.map((k, i) => <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: th.ink, padding: "2px 0" }}><span style={{ width: 118, color: th.subtleInk }}>{factorLabels[i]}</span>{bar(sc[k], th)}<span style={{ width: 24, textAlign: "end" }}>{Math.round(sc[k])}</span></div>)}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10.5, color: th.subtleInk, marginTop: 12 }}><span>{L.mapLow}</span><div style={{ flex: 1, maxWidth: 140, height: 6, background: `linear-gradient(90deg, ${mixHex(base, th.accent, .18)}, ${th.accent})` }} /><span>{L.mapHigh}</span></div>
        <p style={{ color: th.subtleInk, fontSize: 10.5, margin: "8px 0 0" }}>{L.mapNote}</p>
        {["Qatar", "Bahrain"].some(n => val[n] !== undefined) && <p style={{ color: th.subtleInk, fontSize: 10.5, margin: "6px 0 0" }}>{["Qatar", "Bahrain"].filter(n => val[n] !== undefined).map(n => `${n} ${Math.round(val[n])}`).join(" · ")}</p>}
      </div>
    </div>
  </section>;
}
export function ScoringSuite(props) {
  const [w, setW] = useState(PRESETS[0].w);
  return <><MapPanel {...props} w={w} /><ScoringPanel {...props} w={w} setW={setW} /></>;
}

/* ---------- scenario comparison ---------- */
export function ScenarioCompare({ rec, A, th, lang, t, factorLabels, data, simulate, getTimelineLabel }) {
  const L = A.L, cs = Object.keys(rec.scores);
  const [ca, setCa] = useState(A.target), [cb, setCb] = useState(A.second);
  const base = Number(rec.input.budget) || 1;
  const [bud, setBud] = useState(Math.round(base * 2 * 4) / 4);
  const sA = simulate(base), sB = simulate(bud);
  const rg = c => (data.REGULATORY_CHECK || {})[c] || {};
  const th2 = { padding: "6px 8px", textAlign: "start", fontSize: 11, color: th.subtleInk, fontWeight: 500, borderBottom: `1px solid ${th.lineColor}` };
  const td = { padding: "6px 8px", fontSize: 12, color: th.ink, borderBottom: `1px solid ${th.lineColor}` };
  const sel = (v, f) => <select value={v} onChange={e => f(e.target.value)} aria-label={L.duelTitle} style={{ background: th.cardBg, color: th.ink, border: `1px solid ${th.lineColor}`, borderRadius: 3, padding: "4px 8px", minHeight: 36, fontSize: 12.5 }}>{cs.map(c => <option key={c} value={c}>{c}</option>)}</select>;
  const win = FACTORS.filter(k => rec.scores[ca][k] > rec.scores[cb][k]).length, lose = FACTORS.filter(k => rec.scores[ca][k] < rec.scores[cb][k]).length;
  const verdict = ca === cb || win === lose ? L.duelTie : win > lose ? fmt(L.duelVerdict, { a: ca, b: cb, n: win }) : fmt(L.duelVerdict, { a: cb, b: ca, n: lose });
  const cell = (c, o, k) => { const v = rec.scores[c][k], u = rec.scores[o][k]; return <td style={{ ...td, fontWeight: v > u ? 700 : 400, color: v > u ? th.accent : th.ink }}>{Math.round(v)}</td>; };
  const strat = x => (t.strategy && t.strategy[x]) || x;
  const be = x => x || t.planNoBreakEven;
  const changed = sB.target !== sA.target;
  return <section data-testid="scenario-compare" style={card(th)}>
    <h3 style={h3(th)}>{L.cmpTitle}</h3>
    <p style={{ color: th.subtleInk, fontSize: 11.5, margin: "4px 0 14px" }}>{L.cmpSub}</p>

    <p style={{ color: th.ink, fontSize: 13, fontWeight: 600, margin: "0 0 8px" }}>{L.duelTitle}</p>
    <div style={{ overflowX: "auto" }}><table data-testid="duel-table" style={{ width: "100%", borderCollapse: "collapse", minWidth: 380 }}>
      <thead><tr><th style={th2} /><th style={th2}>{sel(ca, setCa)}</th><th style={th2}>{sel(cb, setCb)}</th></tr></thead>
      <tbody>
        {FACTORS.map((k, i) => <tr key={k}><td style={td}>{factorLabels[i]}</td>{cell(ca, cb, k)}{cell(cb, ca, k)}</tr>)}
        <tr><td style={{ ...td, fontWeight: 600 }}>{L.rScore}</td>{cell(ca, cb, "overall")}{cell(cb, ca, "overall")}</tr>
        <tr><td style={td}>{L.rTax}</td><td style={td}>{rg(ca).corporateTax || "n/a"}</td><td style={td}>{rg(cb).corporateTax || "n/a"}</td></tr>
        <tr><td style={td}>{L.rVat}</td><td style={td}>{rg(ca).vat || "n/a"}</td><td style={td}>{rg(cb).vat || "n/a"}</td></tr>
      </tbody>
    </table></div>
    <p style={{ color: th.ink, fontSize: 12.5, fontWeight: 600, margin: "8px 0 20px" }}>{verdict}</p>

    <p style={{ color: th.ink, fontSize: 13, fontWeight: 600, margin: "0 0 8px" }}>{L.budgetTitle}</p>
    <label style={{ display: "block", fontSize: 11.5, color: th.subtleInk, marginBottom: 8 }}>{L.budgetLbl}: <strong style={{ color: th.ink }}>{bud}</strong>
      <input type="range" min="0.25" max={Math.max(10, Math.ceil(base * 4))} step="0.25" value={bud} aria-label={L.budgetLbl} onChange={e => setBud(Number(e.target.value))} style={{ width: "100%", accentColor: th.accent }} /></label>
    <div style={{ overflowX: "auto" }}><table data-testid="budget-table" style={{ width: "100%", borderCollapse: "collapse", minWidth: 380 }}>
      <thead><tr><th style={th2} /><th style={th2}>{L.scA}: {L.current} ({base} €M)</th><th style={th2}>{L.scB}: {L.alt} ({bud} €M)</th></tr></thead>
      <tbody>
        <tr><td style={td}>{L.rTarget}</td><td style={{ ...td, fontWeight: 700 }}>{sA.target}</td><td style={{ ...td, fontWeight: 700, color: changed ? th.neg : th.ink }}>{sB.target}</td></tr>
        <tr><td style={td}>{L.rScore}</td><td style={td}>{sA.overall}</td><td style={td}>{sB.overall}</td></tr>
        <tr><td style={td}>{L.rBE}</td><td style={td}>{be(sA.breakEven)}</td><td style={td}>{be(sB.breakEven)}</td></tr>
        <tr><td style={td}>{L.rTime}</td><td style={td}>{getTimelineLabel(sA.timeline, t)}</td><td style={td}>{getTimelineLabel(sB.timeline, t)}</td></tr>
        <tr><td style={td}>{L.rStrat}</td><td style={td}>{strat(sA.strategy)}</td><td style={td}>{strat(sB.strategy)}</td></tr>
      </tbody>
    </table></div>
    <p style={{ color: changed ? th.neg : th.ink, fontSize: 12.5, fontWeight: 600, margin: "8px 0 0" }}>{changed ? fmt(L.budgetChange, { b: bud, c1: sA.target, c2: sB.target }) : fmt(L.budgetSame, { b: bud, c: sA.target })}</p>
    <p style={{ color: th.subtleInk, fontSize: 10.5, margin: "6px 0 0" }}>{L.scenNote}</p>
  </section>;
}

/* ---------- one-page decision memo (print) ---------- */
export function MemoDoc({ A, rec, lang, factorLabels, data, t, breakEven, timeline, company, dateLabel, font }) {
  const L = A.L, scores = rec.scores, target = A.target;
  const ranked = rankWith(scores, PRESETS[0].w);
  const reasons = [A.lead, ...A.opp.map(o => `${o.label} ${o.v}: ${o.text}`)].filter(Boolean).slice(0, 3);
  const risks = [...A.risks, ...A.barr.map(o => `${o.label} ${o.v}: ${o.text}`)].slice(0, 3);
  const H = ({ children }) => <h3 style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, borderBottom: "1.5px solid #111", paddingBottom: 3, margin: "0 0 6px" }}>{children}</h3>;
  const ul = rows => <ul style={{ margin: 0, paddingInlineStart: 16, listStyle: "disc" }}>{rows.map((r, i) => <li key={i} style={{ marginBottom: 2 }}>{r}</li>)}</ul>;
  const exact = { WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" };
  return <div className="print-doc" style={{ display: "none" }} data-print-mode="memo"><div style={{ fontFamily: font, color: "#111", maxWidth: 720, margin: "0 auto", padding: "6mm 4mm", fontSize: 10.5, lineHeight: 1.45, maxHeight: "270mm", overflow: "hidden" }}>
    <p style={{ margin: 0, fontSize: 10, color: "#666" }}>{L.memoTitle} · {dateLabel}</p>
    <h1 style={{ fontSize: 22, fontWeight: 700, margin: "4px 0 2px" }}>{company}: {target}</h1>
    <div style={{ background: "#f4ecd8", padding: "8px 12px", margin: "8px 0 12px", ...exact }}>
      <strong>{L.memoRec}:</strong> {A.whyLead} {A.robustText} {A.mcText}
      <div style={{ marginTop: 4 }}><strong>{fmt(L.memoAsk, { c: target, b: rec.input.budget })}</strong></div>
    </div>
    <div style={{ display: "flex", gap: 18, marginBottom: 12 }}>
      <div style={{ flex: 1 }}><H>{L.memoWhy}</H>{ul(reasons)}</div>
      <div style={{ flex: 1 }}><H>{L.memoRisks}</H>{ul(risks)}</div>
    </div>
    <div style={{ display: "flex", gap: 18, marginBottom: 12 }}>
      <div style={{ flex: 1 }}><H>{L.memoCost}</H>
        <table style={{ width: "100%", borderCollapse: "collapse" }}><tbody>
          {[[L.rScore, `${scores[target].overall}/100`], [L.kpiMargin, `${A.margin} ${L.pts}`], [L.kpiBudget, `${rec.input.budget} ${t.costEurLabel}`], [L.rTime, timeline], [L.rBE, breakEven], [L.rStrat, (t.strategy && t.strategy[rec.rec.entryStrategy]) || ""]].map(([k, v], i) => <tr key={i}><td style={{ padding: "2px 0", color: "#555" }}>{k}</td><td style={{ padding: "2px 0", fontWeight: 600 }}>{v}</td></tr>)}
        </tbody></table></div>
      <div style={{ flex: 1 }}><H>{L.memoRank}</H>
        {ranked.map(([c, v], i) => <div key={c} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}><span style={{ width: 16 }}>{i + 1}</span><span style={{ width: 70, fontWeight: c === target ? 700 : 400 }}>{c}</span><div style={{ flex: 1, height: 7, background: "#e6e6e6", ...exact }}><div style={{ width: `${v}%`, height: "100%", background: c === target ? "#B8923F" : "#9aa3b2", ...exact }} /></div><span style={{ width: 30, textAlign: "end" }}>{Math.round(v * 10) / 10}</span></div>)}
      </div>
    </div>
    <H>{L.memoNext}</H>
    <ol style={{ margin: 0, paddingInlineStart: 18, listStyle: "decimal" }}>{A.steps.slice(0, 5).map((x, i) => <li key={i} style={{ marginBottom: 2 }}>{x}</li>)}</ol>
    <p style={{ fontSize: 8.5, color: "#777", marginTop: 12 }}>{L.memoBasis} {L.langNote}</p>
  </div></div>;
}
