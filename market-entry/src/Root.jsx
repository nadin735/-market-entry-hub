import React, { useState, useEffect, Suspense } from "react";
import * as backend from "./backend.js";
import { LegalPage } from "./legal.jsx";
import { MARK_GOLD, MARK_BLUE, COIN } from "./hubAssets.js";
import ThemeToggle from "./ThemeToggle.jsx";
import { readTheme, writeTheme } from "./theme.js";
import HubAuth from "./HubAuth.jsx";

const GCCApp = React.lazy(() => import("./tools/gcc/App.jsx"));
const EuropeApp = React.lazy(() => import("./tools/europe/App.jsx"));

const FONT = "'Inter','Noto Sans Arabic',system-ui,sans-serif";
const GOLD = "#C8A96B", BLUE = "#5F8BC3";

const FEAT_DE = ["Bewertung über fünf Faktoren: Markt, Wettbewerb, Regulatorik, Partner und Investitionspotenzial", "Wirtschaftsdaten der Weltbank je Land (Stand 2024) mit Quellen und Datenstatus", "Finanzmodell mit Gewinnschwelle und Budgetsensitivität", "Import von CSV Dateien und Scan von PDF Firmenprofilen", "Nachvollziehbare Bewertung: Gewichte, Sensitivität, Monte Carlo und Begründung", "Quellen mit Datenstatus (Quelle, Schätzung, Annahme) und Datenjahr", "Bewertungskarte, Szenariovergleich und Entscheidungsmemo auf einer Seite"];
const FEAT_EN = ["Scoring across five factors: market, competition, regulation, partners and investment potential", "World Bank economic data per country (as of 2024) with sources and data status", "Financial model with break even point and budget sensitivity", "CSV import and PDF company profile scan", "Traceable scoring: weights, sensitivity, Monte Carlo and rationale", "Sources with data status (source, estimate, assumption) and data year", "Score card, scenario comparison and a one page decision memo"];
const FEAT_AR = ["تقييم وفق خمسة عوامل: السوق والمنافسة والتنظيم والشركاء وإمكانات الاستثمار", "بيانات البنك الدولي الاقتصادية لكل دولة (حتى 2024) مع المصادر وحالة البيانات", "نموذج مالي مع نقطة التعادل وحساسية الميزانية", "استيراد ملفات CSV ومسح ملفات PDF للشركات", "تقييم قابل للتتبع: الأوزان والحساسية ومونت كارلو والتعليل", "مصادر مع حالة البيانات (مصدر، تقدير، افتراض) وسنة البيانات", "بطاقة التقييم ومقارنة السيناريوهات ومذكرة قرار في صفحة واحدة"];

const TXT = {
  de: {
    brand: "Market Entry", h1: "Wohin soll es gehen?",
    lead: "Wählen Sie Ihre Richtung. Beide Tools arbeiten mit derselben nachvollziehbaren Bewertungslogik, belegten Marktdaten und einem vollständigen Eintrittsplan als PDF.",
    open: "Öffnen",
    a: { name: "GCC Market Entry", dir: "Europa → Golfregion", desc: "Für europäische Unternehmen, die nach Saudi Arabien, in die VAE, nach Katar, Kuwait, Bahrain oder Oman expandieren wollen.", f: FEAT_DE },
    b: { name: "Europe Market Entry", dir: "Golfregion → Europa", desc: "Für Unternehmen und Investoren aus der Golfregion mit Blick auf Deutschland, Frankreich, Großbritannien, Italien, Spanien oder die Niederlande. Mit arabischer Oberfläche (RTL).", f: ["Dieselbe Bewertungslogik mit fünf Faktoren, gespiegelt auf europäische Zielmärkte", "Neutraler Vergleich europäischer Märkte, einschließlich Branchen nach Scharia Vorgaben", "Eigener Abschnitt für Deutschland und Unternehmen aus der DACH Region", "Oberfläche auf Arabisch (RTL), Deutsch und Englisch", ...FEAT_DE.slice(4)] },
    signedAs: "Angemeldet als", logout: "Abmelden", signin: "Anmelden", legal: "Rechtliches", disc: "Entscheidungsgrundlage auf Basis fester Regeln. Keine Rechtsberatung, Steuerberatung oder Anlageberatung. Alle Angaben ohne Gewähr.", langs: "Sprache",
    opts: "Wie möchten Sie starten?", optsHint: "Die Wahl gilt für beide Tools und bleibt gespeichert. Eine Anmeldung ist nur für das Konto nötig und erfolgt nur hier.",
    mDemo: "Mit Demodaten testen", mDemoD: "Ohne Login. Beispieldaten sind vorausgefüllt, ideal zum schnellen Ansehen.",
    mAccount: "Mit Konto und gespeicherten Daten", mAccountD: "Anmeldung per Mailadresse. Ihre Analysen werden gespeichert und sind auf jedem Gerät verfügbar.",
    mLocal: "Ohne Login mit eigenen Daten", mLocalD: "Eigene Daten bleiben nur in diesem Browser. Kein Konto nötig.",
    oUpload: "Mit Upload starten", oUploadD: "Öffnet eine neue Analyse mit Upload für PDF oder CSV.",
    needLogin: "Bitte zuerst anmelden oder ein Konto erstellen. Danach öffnen sich beide Tools ohne weitere Anmeldung.",
    acct: "Konto"
  },
  en: {
    brand: "Market Entry", h1: "Where are you heading?",
    lead: "Choose your direction. Both tools use the same traceable scoring logic, sourced market data and a complete entry plan as PDF.",
    open: "Open",
    a: { name: "GCC Market Entry", dir: "Europe → Gulf region", desc: "For European companies that want to expand to Saudi Arabia, the UAE, Qatar, Kuwait, Bahrain or Oman.", f: FEAT_EN },
    b: { name: "Europe Market Entry", dir: "Gulf region → Europe", desc: "For companies and investors from the Gulf region looking at Germany, France, the UK, Italy, Spain or the Netherlands. With an Arabic interface (RTL).", f: ["The same five factor scoring logic, mirrored for European target markets", "Neutral comparison of European markets, including sectors that follow Sharia rules", "A dedicated section for Germany and companies from the DACH region", "Interface in Arabic (RTL), German and English", ...FEAT_EN.slice(4)] },
    signedAs: "Signed in as", logout: "Sign out", signin: "Sign in", legal: "Legal", disc: "A decision basis built on fixed rules. Not legal, tax or investment advice. No guarantee for any information.", langs: "Language",
    opts: "How would you like to start?", optsHint: "Your choice applies to both tools and is remembered. Signing in is only needed for an account and happens only here.",
    mDemo: "Test with demo data", mDemoD: "No login. Sample data is pre filled, ideal for a quick look.",
    mAccount: "With an account and saved data", mAccountD: "Sign in with your email. Your analyses are saved and available on any device.",
    mLocal: "No login, own data", mLocalD: "Your own data stays in this browser only. No account needed.",
    oUpload: "Start with upload", oUploadD: "Opens a new analysis with upload for PDF or CSV.",
    needLogin: "Please sign in or create an account first. After that both tools open without another sign in.",
    acct: "Account"
  },
  ar: {
    brand: "Market Entry", h1: "إلى أين تتجه؟",
    lead: "اختر اتجاهك. تعتمد الأداتان على منطق تقييم واضح قابل للتتبع وبيانات سوق موثقة وخطة دخول كاملة بصيغة PDF.",
    open: "فتح",
    a: { name: "GCC Market Entry", dir: "أوروبا ← منطقة الخليج", desc: "للشركات الأوروبية التي تريد التوسع في السعودية أو الإمارات أو قطر أو الكويت أو البحرين أو عُمان.", f: FEAT_AR },
    b: { name: "Europe Market Entry", dir: "منطقة الخليج ← أوروبا", desc: "للشركات والمستثمرين من الخليج الذين يستهدفون ألمانيا أو فرنسا أو بريطانيا أو إيطاليا أو إسبانيا أو هولندا. مع واجهة عربية كاملة.", f: ["منطق التقييم نفسه بخمسة عوامل، مطبّقاً على الأسواق الأوروبية المستهدفة", "مقارنة محايدة للأسواق الأوروبية، بما في ذلك القطاعات الملتزمة بأحكام الشريعة", "قسم خاص بألمانيا وشركات منطقة DACH", "واجهة بالعربية والألمانية والإنجليزية", ...FEAT_AR.slice(4)] },
    signedAs: "مسجّل باسم", logout: "تسجيل الخروج", signin: "تسجيل الدخول", legal: "المعلومات القانونية", disc: "أساس قرار قائم على قواعد ثابتة. ليس استشارة قانونية أو ضريبية أو استثمارية. جميع المعلومات دون ضمان.", langs: "اللغة",
    opts: "كيف تريد أن تبدأ؟", optsHint: "ينطبق اختيارك على الأداتين ويُحفظ. تسجيل الدخول مطلوب للحساب فقط ويتم هنا فقط.",
    mDemo: "التجربة ببيانات تجريبية", mDemoD: "بدون تسجيل دخول. البيانات النموذجية مملوءة مسبقًا.",
    mAccount: "بحساب وبيانات محفوظة", mAccountD: "سجّل الدخول بالبريد الإلكتروني. تُحفظ تحليلاتك وتتوفر على أي جهاز.",
    mLocal: "بدون تسجيل دخول وببياناتك", mLocalD: "تبقى بياناتك في هذا المتصفح فقط. لا حاجة لحساب.",
    oUpload: "البدء برفع ملف", oUploadD: "يفتح تحليلاً جديدًا مع رفع ملف PDF أو CSV.",
    needLogin: "سجّل الدخول أو أنشئ حسابًا أولاً. بعدها تُفتح الأداتان دون تسجيل دخول آخر.",
    acct: "حساب"
  }
};

function parseHash() {
  const h = (typeof window !== "undefined" && window.location.hash) || "";
  if (/^#gcc(\/|$)/.test(h)) return "gcc";
  if (/^#europe(\/|$)/.test(h)) return "europe";
  if (/^#rechtliches(-[a-z]+)?$/.test(h)) return "legal";
  return "hub";
}
function readLang() {
  try { const v = window.localStorage.getItem("ui_lang"); if (v === "de" || v === "en" || v === "ar") return v; } catch (e) { /* blocked */ }
  const nav = ((typeof navigator !== "undefined" && navigator.language) || "de").slice(0, 2).toLowerCase();
  return nav === "ar" ? "ar" : nav === "en" ? "en" : "de";
}

const PAL = {
  dark: { bg: "#050608", ink: "#EDEAE2", sub: "#A5A8B2", soft: "#C9CBD3", line: "rgba(255,255,255,0.12)", edge: "rgba(255,255,255,0.10)", card: "rgba(255,255,255,0.03)", gold: GOLD, blue: BLUE, onAccent: "#0B0D12", field: "rgba(255,255,255,0.04)" },
  light: { bg: "#F6F3EC", ink: "#14161C", sub: "#575C68", soft: "#3A3E48", line: "rgba(20,22,28,0.16)", edge: "rgba(20,22,28,0.12)", card: "#FFFFFF", gold: "#8A6D2F", blue: "#3D68A0", onAccent: "#0B0D12", field: "rgba(20,22,28,0.04)" }
};

function Card({ color, accent, mark, tool, href, T, d, onGo, P }) {
  const [hov, setHov] = useState(false);
  return <a href={href} data-testid={`hub-${tool}`} onClick={e => { e.preventDefault(); onGo(tool); }} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} onFocus={() => setHov(true)} onBlur={() => setHov(false)}
    style={{ display: "flex", flexDirection: "column", gap: 14, padding: 28, borderRadius: 18, textDecoration: "none", color: P.ink, background: P.card, border: `1px solid ${hov ? color : P.edge}`, boxShadow: hov ? `0 24px 60px -24px ${color}66` : "none", transform: hov ? "translateY(-3px)" : "none", transition: "all .25s ease", flex: "1 1 340px", minWidth: 0 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <img src={mark} alt="" style={{ height: 34, width: "auto", background: "#0B0D12", padding: 4, borderRadius: 8, boxSizing: "content-box" }} />
      <span style={{ fontSize: 13, color: accent }}>{d.dir}</span>
    </div>
    <h2 style={{ fontSize: 28, fontWeight: 500, margin: 0 }}>{d.name}</h2>
    <p style={{ margin: 0, color: P.sub, fontSize: 14.5, lineHeight: 1.65 }}>{d.desc}</p>
    <ul style={{ margin: 0, padding: 0, listStyle: "none", color: P.soft, fontSize: 13.5, lineHeight: 1.7 }}>
      {d.f.map((x, i) => <li key={i} style={{ display: "flex", gap: 10, padding: "3px 0" }}><span aria-hidden="true" style={{ color: accent, flex: "none" }}>◆</span><span>{x}</span></li>)}
    </ul>
    <span style={{ marginTop: "auto", alignSelf: "flex-start", padding: "10px 20px", borderRadius: 4, background: color, color: P.onAccent, fontWeight: 600, fontSize: 14 }}>{T.open} {document.dir === "rtl" ? "←" : "→"}</span>
  </a>;
}

function Opt({ id, label, hint, checked, onChange, disabled, P, radio }) {
  return <label htmlFor={id} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 14px", borderRadius: 10, border: `1px solid ${checked ? P.gold : P.edge}`, background: P.card, cursor: disabled ? "default" : "pointer", flex: "1 1 260px", minWidth: 0, minHeight: 44, opacity: disabled ? 0.55 : 1 }}>
    <input id={id} data-testid={id} type={radio ? "radio" : "checkbox"} name={radio ? "start-mode" : undefined} checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} style={{ marginTop: 3, width: 24, height: 24, accentColor: P.gold, flex: "none" }} />
    <span><span style={{ display: "block", fontSize: 14.5, fontWeight: 500, color: P.ink }}>{label}</span><span style={{ display: "block", fontSize: 13, lineHeight: 1.55, color: P.sub, marginTop: 2 }}>{hint}</span></span>
  </label>;
}

const FIXED_DEMO = import.meta.env.VITE_DEMO === "1";
const MODES = ["demo", "account", "local"];
(function bootMode() {
  // First visit: open in demo mode (no login wall). Returning from a confirmation mail: account mode.
  // The mode decides whether the local demo storage (jast_demo) is used; it is read at load, so a change reloads once.
  try {
    if (FIXED_DEMO || typeof window === "undefined") return;
    window.localStorage.getItem("me_mode"); // throws when storage is blocked: then stay in memory mode, no reload
    let m = backend.safeLSGet("me_mode");
    if (!MODES.includes(m)) {
      m = /access_token=/.test(window.location.hash || "") || backend.safeLSGet("jast_token") ? "account" : "demo";
      backend.safeLSSet("me_mode", m);
    }
    const wantDemo = m !== "account";
    if (wantDemo !== backend.IS_DEMO) { if (wantDemo) backend.safeLSSet("jast_demo", "1"); else backend.safeLSDel("jast_demo"); window.location.reload(); }
  } catch (e) { /* ignore */ }
})();
function readMode() {
  if (FIXED_DEMO) return "demo";
  const m = backend.safeLSGet("me_mode");
  return MODES.includes(m) ? m : "account";
}

export default function Root() {
  const [route, setRoute] = useState(parseHash);
  const [lang, setLangState] = useState(readLang);
  const [dark, setDark] = useState(readTheme);
  const [mode, setModeState] = useState(readMode);
  const [upload, setUpload] = useState(false);
  const [needLogin, setNeedLogin] = useState(false);
  const [user, setUser] = useState(null); // shared login: { name } or null
  const P = dark ? PAL.dark : PAL.light;
  const refreshUser = async () => {
    try {
      if (backend.enabled) { const u = await backend.getUser(); setUser(u ? { name: (u.user_metadata && (u.user_metadata.name || u.user_metadata.full_name)) || u.email } : null); }
      else { const s = backend.demoSession(); setUser(s ? { name: s.name } : null); }
    } catch (e) { setUser(null); }
  };
  useEffect(() => { refreshUser(); }, [route]);
  useEffect(() => { const off = backend.onAuth(() => refreshUser()); return off; }, []);
  const logout = async () => { try { if (backend.enabled) await backend.signOut(); else backend.demoLogout(); } catch (e) { /* ignore */ } setUser(null); };
  const setLang = l => { setLangState(l); try { window.localStorage.setItem("ui_lang", l); } catch (e) { /* ignore */ } };
  const toggleTheme = () => { const n = !dark; setDark(n); writeTheme(n); };
  useEffect(() => {
    const f = () => { setRoute(parseHash()); setLangState(readLang()); setDark(readTheme()); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", f);
    return () => window.removeEventListener("hashchange", f);
  }, []);
  const T = TXT[lang], isRTL = lang === "ar";
  useEffect(() => {
    document.title = route === "gcc" ? "GCC Market Entry" : route === "europe" ? "Europe Market Entry" : "Market Entry GCC und Europa";
    if (route === "hub" || route === "legal") { const am = document.getElementById("ambient"); if (am) am.remove(); document.documentElement.style.background = P.bg; document.body.classList.remove("printing-report"); }
    document.documentElement.lang = lang; document.documentElement.dir = isRTL && route === "hub" ? "rtl" : "ltr";
  }, [route, lang, isRTL, P.bg]);

  // Navigation by state first (works even where the preview sandbox blocks hash navigation); the URL hash is best-effort.
  const nav = r => {
    if (r === "gcc" || r === "europe") {
      if (mode === "account" && !user) { setNeedLogin(true); window.scrollTo(0, 0); return; }
      const start = mode === "demo" ? "testdata" : upload ? "upload" : "";
      if (start) backend.safeLSSet("me_start", start); else backend.safeLSDel("me_start");
    }
    try { window.history.pushState(null, "", r === "hub" ? window.location.pathname + window.location.search : r === "legal" ? "#rechtliches" : "#" + r); } catch (e) { /* sandboxed preview */ } setRoute(r); window.scrollTo(0, 0);
  };
  const goHub = arg => { if (arg === "login") setNeedLogin(true); try { window.history.pushState(null, "", window.location.pathname + window.location.search); } catch (e) { /* sandbox */ } setRoute("hub"); setLangState(readLang()); setDark(readTheme()); window.scrollTo(0, 0); };
  const selectMode = m => {
    backend.safeLSSet("me_mode", m);
    const wantDemo = m !== "account";
    if (wantDemo !== backend.IS_DEMO) { if (wantDemo) backend.safeLSSet("jast_demo", "1"); else backend.safeLSDel("jast_demo"); window.location.reload(); return; }
    setModeState(m); setNeedLogin(false);
  };

  if (route === "gcc" || route === "europe") {
    backend.setTool(route);
    const Tool = route === "gcc" ? GCCApp : EuropeApp;
    return <Suspense fallback={<div style={{ minHeight: "100vh", background: P.bg }} />}><Tool key={route} onHub={goHub} skipIntro /></Suspense>;
  }

  const th = { ink: P.ink, subtleInk: P.sub, lineColor: P.line, cardBg: P.card, accent: P.gold, fontBody: FONT, fontDisplay: FONT, isRTL };
  const shell = { minHeight: "100vh", background: P.bg, color: P.ink, fontFamily: FONT, direction: isRTL ? "rtl" : "ltr", display: "flex", flexDirection: "column" };
  const bar = <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, padding: "16px 24px", borderBottom: `1px solid ${P.edge}` }}>
    <a href="#" onClick={e => { e.preventDefault(); goHub(); }} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: P.ink }}>
      <img src={COIN} alt="EU GCC Bridge" style={{ height: 40, width: 40, borderRadius: "50%" }} /><span style={{ fontSize: 20, fontWeight: 600 }}>{T.brand}</span>
    </a>
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
    {user ? <span data-testid="hub-user" style={{ fontSize: 13, color: P.soft }}>{T.signedAs} <strong style={{ fontWeight: 600 }}>{user.name}</strong> · <button type="button" onClick={logout} style={{ color: P.gold, textDecoration: "underline", textUnderlineOffset: 3, minHeight: 44 }}>{T.logout}</button></span>
      : null}
    <ThemeToggle dark={dark} lang={lang} onToggle={toggleTheme} color={P.sub} border={P.line} />
    <div role="group" aria-label={T.langs} style={{ display: "flex", borderRadius: 6, overflow: "hidden", border: `1px solid ${P.line}` }}>
      {["de", "en", "ar"].map(l => <button key={l} type="button" onClick={() => setLang(l)} style={{ padding: "4px 12px", fontSize: 12, fontWeight: 500, background: lang === l ? GOLD : "transparent", color: lang === l ? "#0B0D12" : P.sub, cursor: "pointer" }}>{l.toUpperCase()}</button>)}
    </div>
    </div>
  </div>;

  if (route === "legal") {
    const m = /^#rechtliches(?:-([a-z]+))?$/.exec(window.location.hash || "");
    return <div style={shell}>{bar}<LegalPage lang={lang} appName={T.brand} th={th} anchor={m && m[1] || ""} onBack={goHub} /></div>;
  }

  return <div style={shell}>
    {bar}
    <main style={{ flex: 1, maxWidth: 1080, width: "100%", margin: "0 auto", padding: "56px 24px 40px", boxSizing: "border-box" }}>
      <img src={COIN} alt="EU GCC Bridge" style={{ height: 112, width: 112, borderRadius: "50%", display: "block", marginBottom: 22 }} />
      <h1 style={{ fontSize: "clamp(34px,5vw,56px)", fontWeight: 500, lineHeight: 1.1, margin: "14px 0 16px", letterSpacing: "-0.01em" }}>{T.h1}</h1>
      <p style={{ color: P.sub, maxWidth: 640, fontSize: 16, lineHeight: 1.7, margin: "0 0 32px" }}>{T.lead}</p>
      <section aria-labelledby="start-opts" style={{ margin: "0 0 28px" }}>
        <h2 id="start-opts" style={{ fontSize: 15, fontWeight: 600, margin: "0 0 4px" }}>{T.opts}</h2>
        <p style={{ color: P.sub, fontSize: 13, margin: "0 0 12px" }}>{T.optsHint}</p>
        <div role="radiogroup" aria-labelledby="start-opts" style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <Opt radio P={P} id="mode-demo" label={T.mDemo} hint={T.mDemoD} checked={mode === "demo"} onChange={() => selectMode("demo")} />
          <Opt radio P={P} id="mode-account" label={T.mAccount} hint={T.mAccountD} checked={mode === "account"} disabled={FIXED_DEMO} onChange={() => selectMode("account")} />
          <Opt radio P={P} id="mode-local" label={T.mLocal} hint={T.mLocalD} checked={mode === "local"} onChange={() => selectMode("local")} />
        </div>
        {mode !== "demo" && <div style={{ marginTop: 12, maxWidth: 420 }}><Opt P={P} id="opt-upload" label={T.oUpload} hint={T.oUploadD} checked={upload} onChange={setUpload} /></div>}
      </section>
      {mode === "account" && !user && <>
        {needLogin && <p role="status" style={{ color: P.gold, fontSize: 13.5, margin: "0 0 12px" }}>{T.needLogin}</p>}
        <HubAuth lang={lang} th={th} onDone={() => { setNeedLogin(false); refreshUser(); }} onLegal={() => nav("legal")} />
      </>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
        <Card P={P} color={GOLD} accent={P.gold} mark={MARK_GOLD} tool="gcc" href="#gcc" T={T} d={T.a} onGo={nav} />
        <Card P={P} color={BLUE} accent={P.blue} mark={MARK_BLUE} tool="europe" href="#europe" T={T} d={T.b} onGo={nav} />
      </div>
    </main>
    <footer style={{ padding: "22px 24px 30px", borderTop: `1px solid ${P.edge}`, color: P.sub, fontSize: 12.5, lineHeight: 1.7, textAlign: "center" }}>
      <p style={{ margin: "0 0 6px" }}>{T.disc}</p>
      <a href="#rechtliches" onClick={e => { e.preventDefault(); nav("legal"); }} style={{ color: P.sub, textDecoration: "underline", textUnderlineOffset: 3, minHeight: 44, display: "inline-flex", alignItems: "center" }}>{T.legal}</a>
    </footer>
  </div>;
}
