import React, { useState, useEffect, Suspense } from "react";
import * as backend from "./backend.js";
import { LegalPage } from "./legal.jsx";
import { MARK_GOLD, MARK_BLUE, LOGO_MIX } from "./hubAssets.js";
import HubAuth from "./HubAuth.jsx";

const GCCApp = React.lazy(() => import("./tools/gcc/App.jsx"));
const EuropeApp = React.lazy(() => import("./tools/europe/App.jsx"));

const FONT = "'Inter','Noto Sans Arabic',system-ui,sans-serif";
const GOLD = "#C8A96B", BLUE = "#5F8BC3";

const TXT = {
  de: {
    brand: "Market Entry", eyebrow: "Zwei Richtungen, ein Ansatz", h1: "Wohin soll es gehen?",
    lead: "Wählen Sie Ihre Richtung. Beide Tools arbeiten mit derselben nachvollziehbaren Scoring-Logik, quellenbelegten Marktdaten und einem vollständigen Entry-Plan als PDF.",
    open: "Öffnen",
    a: { name: "GCC Market Entry", dir: "Europa → Golfregion", desc: "Für europäische Unternehmen, die in Saudi-Arabien, den VAE, Katar, Kuwait, Bahrain oder Oman wachsen wollen.", f: ["6 GCC-Märkte im Vergleich", "Rangliste, Radar & Positionierung", "Kompletter Entry-Plan als PDF"] },
    b: { name: "Europe Market Entry", dir: "Golfregion → Europa", desc: "Für Unternehmen und Investoren aus der Golfregion mit Blick auf Deutschland, Frankreich, UK, Italien, Spanien oder die Niederlande.", f: ["6 europäische Kernmärkte im Vergleich", "Neutrale Empfehlung, DACH-Abschnitt", "Kompletter Entry-Plan als PDF"] },
    account: "Ein Login für beide Tools.", signedAs: "Angemeldet als", logout: "Abmelden", signin: "Anmelden", legal: "Rechtliches", disc: "Regelbasierte Entscheidungsgrundlage – keine Rechts-, Steuer- oder Anlageberatung. Alle Angaben ohne Gewähr.", langs: "Sprache"
  },
  en: {
    brand: "Market Entry", eyebrow: "Two directions, one approach", h1: "Where are you heading?",
    lead: "Choose your direction. Both tools use the same traceable scoring logic, sourced market data and a complete entry plan as PDF.",
    open: "Open",
    a: { name: "GCC Market Entry", dir: "Europe → Gulf region", desc: "For European companies that want to grow in Saudi Arabia, the UAE, Qatar, Kuwait, Bahrain or Oman.", f: ["6 GCC markets compared", "Ranking, radar & positioning", "Complete entry plan as PDF"] },
    b: { name: "Europe Market Entry", dir: "Gulf region → Europe", desc: "For companies and investors from the Gulf region looking at Germany, France, the UK, Italy, Spain or the Netherlands.", f: ["6 core European markets compared", "Neutral recommendation, DACH section", "Complete entry plan as PDF"] },
    account: "One login for both tools.", signedAs: "Signed in as", logout: "Sign out", signin: "Sign in", legal: "Legal", disc: "Rule-based basis for decisions – not legal, tax or investment advice. No guarantee for any information.", langs: "Language"
  },
  ar: {
    brand: "Market Entry", eyebrow: "اتجاهان، منهج واحد", h1: "إلى أين تتجه؟",
    lead: "اختر اتجاهك. تعتمد الأداتان على منطق تقييم واضح قابل للتتبع وبيانات سوق موثقة وخطة دخول كاملة بصيغة PDF.",
    open: "فتح",
    a: { name: "GCC Market Entry", dir: "أوروبا ← منطقة الخليج", desc: "للشركات الأوروبية التي تريد النمو في السعودية أو الإمارات أو قطر أو الكويت أو البحرين أو عُمان.", f: ["مقارنة 6 أسواق خليجية", "الترتيب والرادار والتموضع", "خطة دخول كاملة بصيغة PDF"] },
    b: { name: "Europe Market Entry", dir: "منطقة الخليج ← أوروبا", desc: "للشركات والمستثمرين من الخليج الذين يستهدفون ألمانيا أو فرنسا أو بريطانيا أو إيطاليا أو إسبانيا أو هولندا.", f: ["مقارنة 6 أسواق أوروبية رئيسية", "توصية محايدة وقسم DACH", "خطة دخول كاملة بصيغة PDF"] },
    account: "تسجيل دخول واحد للأداتين.", signedAs: "مسجّل باسم", logout: "تسجيل الخروج", signin: "تسجيل الدخول", legal: "المعلومات القانونية", disc: "أساس قرار قائم على قواعد – وليس استشارة قانونية أو ضريبية أو استثمارية. جميع المعلومات دون ضمان.", langs: "اللغة"
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

function Card({ color, mark, tool, href, T, d, onGo }) {
  const [hov, setHov] = useState(false);
  return <a href={href} data-testid={`hub-${tool}`} onClick={e => { e.preventDefault(); onGo(tool); }} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} onFocus={() => setHov(true)} onBlur={() => setHov(false)}
    style={{ display: "flex", flexDirection: "column", gap: 14, padding: 28, borderRadius: 18, textDecoration: "none", color: "#EDEAE2", background: "rgba(255,255,255,0.03)", border: `1px solid ${hov ? color : "rgba(255,255,255,0.10)"}`, boxShadow: hov ? `0 24px 60px -24px ${color}66` : "none", transform: hov ? "translateY(-3px)" : "none", transition: "all .25s ease", flex: "1 1 340px", minWidth: 0 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <img src={mark} alt="" style={{ height: 34, width: "auto" }} />
      <span style={{ fontSize: 13, color }}>{d.dir}</span>
    </div>
    <h2 style={{ fontSize: 28, fontWeight: 500, margin: 0 }}>{d.name}</h2>
    <p style={{ margin: 0, color: "#A5A8B2", fontSize: 14.5, lineHeight: 1.65 }}>{d.desc}</p>
    <ul style={{ margin: 0, padding: 0, listStyle: "none", color: "#C9CBD3", fontSize: 13.5, lineHeight: 2 }}>
      {d.f.map((x, i) => <li key={i}><span style={{ color, marginInlineEnd: 8 }}>◆</span>{x}</li>)}
    </ul>
    <span style={{ marginTop: "auto", alignSelf: "flex-start", padding: "10px 20px", borderRadius: 4, background: color, color: "#0B0D12", fontWeight: 600, fontSize: 14 }}>{T.open} {document.dir === "rtl" ? "←" : "→"}</span>
  </a>;
}

export default function Root() {
  const [route, setRoute] = useState(parseHash);
  const [lang, setLangState] = useState(readLang);
  const [user, setUser] = useState(null); // shared login: { name } or null
  const [showAuth, setShowAuth] = useState(false);
  const refreshUser = async () => {
    try {
      if (backend.enabled) { const u = await backend.getUser(); setUser(u ? { name: (u.user_metadata && u.user_metadata.name) || u.email } : null); }
      else { const s = backend.demoSession(); setUser(s ? { name: s.name } : null); }
    } catch (e) { setUser(null); }
  };
  useEffect(() => { refreshUser(); }, [route]);
  const logout = async () => { try { if (backend.enabled) await backend.signOut(); else backend.demoLogout(); } catch (e) { /* ignore */ } setUser(null); };
  const setLang = l => { setLangState(l); try { window.localStorage.setItem("ui_lang", l); } catch (e) { /* ignore */ } };
  useEffect(() => {
    const f = () => { setRoute(parseHash()); setLangState(readLang()); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", f);
    return () => window.removeEventListener("hashchange", f);
  }, []);
  const T = TXT[lang], isRTL = lang === "ar";
  useEffect(() => {
    document.title = route === "gcc" ? "GCC Market Entry" : route === "europe" ? "Europe Market Entry" : "Market Entry – GCC & Europe";
    if (route === "hub" || route === "legal") { const am = document.getElementById("ambient"); if (am) am.remove(); document.documentElement.style.background = "#050608"; document.body.classList.remove("printing-report"); }
    document.documentElement.lang = lang; document.documentElement.dir = isRTL && route === "hub" ? "rtl" : "ltr";
  }, [route, lang, isRTL]);

  // Navigation by state first (works even where the preview sandbox blocks hash navigation); the URL hash is best-effort.
  const nav = r => { try { window.history.pushState(null, "", r === "hub" ? window.location.pathname + window.location.search : r === "legal" ? "#rechtliches" : "#" + r); } catch (e) { /* sandboxed preview */ } setRoute(r); window.scrollTo(0, 0); };
  const goHub = () => { try { window.history.pushState(null, "", window.location.pathname + window.location.search); } catch (e) { /* sandbox */ } setRoute("hub"); setLangState(readLang()); window.scrollTo(0, 0); };

  if (route === "gcc" || route === "europe") {
    backend.setTool(route);
    const Tool = route === "gcc" ? GCCApp : EuropeApp;
    return <Suspense fallback={<div style={{ minHeight: "100vh", background: "#050608" }} />}><Tool key={route} onHub={goHub} skipIntro /></Suspense>;
  }

  const th = { ink: "#EDEAE2", subtleInk: "#A5A8B2", lineColor: "rgba(255,255,255,0.12)", cardBg: "rgba(255,255,255,0.03)", accent: GOLD, fontBody: FONT, fontDisplay: FONT, isRTL };
  const shell = { minHeight: "100vh", background: "#050608", color: "#EDEAE2", fontFamily: FONT, direction: isRTL ? "rtl" : "ltr", display: "flex", flexDirection: "column" };
  const bar = <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
    <a href="#" onClick={e => { e.preventDefault(); goHub(); }} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "#EDEAE2" }}>
      <img src={LOGO_MIX} alt="Gulf States ↔ Europe" style={{ height: 40, width: "auto" }} /><span style={{ fontSize: 20, fontWeight: 600 }}>{T.brand}</span>
    </a>
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
    {user ? <span data-testid="hub-user" style={{ fontSize: 13, color: "#C9CBD3" }}>{T.signedAs} <strong style={{ fontWeight: 600 }}>{user.name}</strong> · <button type="button" onClick={logout} style={{ color: GOLD, textDecoration: "underline", textUnderlineOffset: 3, minHeight: 44 }}>{T.logout}</button></span>
      : backend.IS_DEMO ? null : <button type="button" data-testid="hub-login" onClick={() => setShowAuth(v => !v)} style={{ padding: "6px 16px", fontSize: 13, borderRadius: 4, border: `1px solid ${GOLD}`, color: GOLD, minHeight: 36 }}>{T.signin}</button>}
    <div role="group" aria-label={T.langs} style={{ display: "flex", borderRadius: 6, overflow: "hidden", border: "1px solid rgba(255,255,255,0.12)" }}>
      {["de", "en", "ar"].map(l => <button key={l} type="button" onClick={() => setLang(l)} style={{ padding: "4px 12px", fontSize: 12, fontWeight: 500, background: lang === l ? GOLD : "transparent", color: lang === l ? "#0B0D12" : "#A5A8B2", cursor: "pointer" }}>{l.toUpperCase()}</button>)}
    </div>
    </div>
  </div>;

  if (route === "legal") {
    const m = /^#rechtliches(?:-([a-z]+))?$/.exec(window.location.hash || "");
    return <div style={shell}>{bar}<LegalPage lang={lang} appName={T.brand} th={th} anchor={m && m[1] || ""} onBack={goHub} /></div>;
  }

  return <div style={shell}>
    {bar}
    <main style={{ flex: 1, maxWidth: 1080, width: "100%", margin: "0 auto", padding: "64px 24px 40px", boxSizing: "border-box" }}>
      <img src={LOGO_MIX} alt="Gulf States ↔ Europe" style={{ height: 120, width: "auto", display: "block", marginBottom: 18 }} />
      {showAuth && !user && <HubAuth lang={lang} th={th} onDone={() => { setShowAuth(false); refreshUser(); }} onClose={() => setShowAuth(false)} onLegal={() => nav("legal")} />}
      <h1 style={{ fontSize: "clamp(34px,5vw,56px)", fontWeight: 500, lineHeight: 1.1, margin: "14px 0 16px", letterSpacing: "-0.01em" }}>{T.h1}</h1>
      <p style={{ color: "#A5A8B2", maxWidth: 640, fontSize: 16, lineHeight: 1.7, margin: "0 0 40px" }}>{T.lead}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
        <Card color={GOLD} mark={MARK_GOLD} tool="gcc" href="#gcc" T={T} d={T.a} onGo={nav} />
        <Card color={BLUE} mark={MARK_BLUE} tool="europe" href="#europe" T={T} d={T.b} onGo={nav} />
      </div>
      {!backend.IS_DEMO && <p style={{ color: "#A5A8B2", fontSize: 13, marginTop: 22 }}>{T.account}</p>}
    </main>
    <footer style={{ padding: "22px 24px 30px", borderTop: "1px solid rgba(255,255,255,0.10)", color: "#A5A8B2", fontSize: 12.5, lineHeight: 1.7, textAlign: "center" }}>
      <p style={{ margin: "0 0 6px" }}>{T.disc}</p>
      <a href="#rechtliches" onClick={e => { e.preventDefault(); nav("legal"); }} style={{ color: "#A5A8B2", textDecoration: "underline", textUnderlineOffset: 3, minHeight: 44, display: "inline-flex", alignItems: "center" }}>{T.legal}</a>
    </footer>
  </div>;
}
