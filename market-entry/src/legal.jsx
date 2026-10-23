import React, { useEffect } from "react";
import { DE } from "./legal/de.js";
import { EN } from "./legal/en.js";
import { AR } from "./legal/ar.js";

/* Operator data comes from build-time environment variables (VITE_LEGAL_*), so no
   personal address is ever hard-coded in the source. Missing mandatory values make the
   Legal page show a visible warning for the operator instead of invented placeholders. */
const str = f => { try { const v = f(); return typeof v === "string" ? v.trim() : ""; } catch (e) { return ""; } };
// static property access on purpose: Vite replaces import.meta.env.VITE_* only in this form
const ENV = {
  VITE_LEGAL_NAME: str(() => import.meta.env.VITE_LEGAL_NAME),
  VITE_LEGAL_PROFESSION: str(() => import.meta.env.VITE_LEGAL_PROFESSION),
  VITE_LEGAL_STREET: str(() => import.meta.env.VITE_LEGAL_STREET),
  VITE_LEGAL_ZIP_CITY: str(() => import.meta.env.VITE_LEGAL_ZIP_CITY),
  VITE_LEGAL_COUNTRY: str(() => import.meta.env.VITE_LEGAL_COUNTRY),
  VITE_LEGAL_EMAIL: str(() => import.meta.env.VITE_LEGAL_EMAIL),
  VITE_LEGAL_PHONE: str(() => import.meta.env.VITE_LEGAL_PHONE),
  VITE_SUPABASE_REGION: str(() => import.meta.env.VITE_SUPABASE_REGION),
  VITE_HOSTING_PROVIDER: str(() => import.meta.env.VITE_HOSTING_PROVIDER),
};
const env = k => ENV[k] || "";
export const LEGAL = {
  name: env("VITE_LEGAL_NAME") || "Nadin Okil",
  profession: env("VITE_LEGAL_PROFESSION"),
  street: env("VITE_LEGAL_STREET"),
  zipCity: env("VITE_LEGAL_ZIP_CITY"),
  country: env("VITE_LEGAL_COUNTRY") || "Deutschland",
  email: env("VITE_LEGAL_EMAIL") || "nadinokil.contact@gmail.com",
  phone: env("VITE_LEGAL_PHONE"),
  region: env("VITE_SUPABASE_REGION") || "EU (Frankfurt, Deutschland)",
  hosting: env("VITE_HOSTING_PROVIDER") || "Vercel Inc. bzw. Netlify, Inc. (USA), je nach Bereitstellung durch die Betreiberin",
};
const PACK = { de: DE, en: EN, ar: AR };
const HOSTING_I18N = {
  en: "Vercel Inc. or Netlify, Inc. (USA), depending on the operator's deployment",
  ar: "Vercel Inc. أو Netlify, Inc. (الولايات المتحدة)، بحسب نشر الجهة المشغّلة",
};
const REGION_I18N = { en: "EU (Frankfurt, Germany)", ar: "الاتحاد الأوروبي (فرانكفورت، ألمانيا)" };
export const legalPack = lang => PACK[lang] || DE;
function fill(str, lang, appName) {
  const hosting = env("VITE_HOSTING_PROVIDER") || HOSTING_I18N[lang] || LEGAL.hosting;
  const region = env("VITE_SUPABASE_REGION") || REGION_I18N[lang] || LEGAL.region;
  return String(str).replace(/\{app\}/g, appName).replace(/\{region\}/g, region).replace(/\{hosting\}/g, hosting);
}
export function legalMissingKeys() {
  const m = [];
  if (!LEGAL.email) m.push("missingEmail");
  return m;
}

function Law({ text, th }) {
  if (!text) return null;
  return <span dir="ltr" style={{ display: "inline-block", marginInlineStart: 8, padding: "1px 8px", borderRadius: 999, border: `1px solid ${th.lineColor}`, color: th.accent, fontSize: 11, lineHeight: 1.7, verticalAlign: "baseline", whiteSpace: "normal" }}>{text}</span>;
}
function Blocks({ blocks, lang, appName, th }) {
  return <>{blocks.map((b, i) => {
    if (b[0] === "h") return <h3 key={i} style={{ color: th.ink, fontFamily: th.fontDisplay, fontSize: 16, fontWeight: 600, margin: "22px 0 8px" }}>{fill(b[1], lang, appName)}</h3>;
    if (b[0] === "p") return <p key={i} style={{ color: th.subtleInk, fontSize: 14, lineHeight: 1.75, margin: "0 0 12px" }}>{fill(b[1], lang, appName)}<Law text={b[2]} th={th} /></p>;
    return <ul key={i} style={{ color: th.subtleInk, fontSize: 14, lineHeight: 1.75, margin: "0 0 12px", paddingInlineStart: 20 }}>{b[1].map((it, j) => <li key={j} style={{ marginBottom: 8 }}>{fill(it[0], lang, appName)}<Law text={it[1]} th={th} /></li>)}</ul>;
  })}</>;
}
function Row({ label, value, law, th }) {
  return <div style={{ display: "grid", gridTemplateColumns: "minmax(120px, 190px) 1fr", gap: 12, padding: "8px 0", borderBottom: `1px solid ${th.lineColor}` }}>
    <div style={{ color: th.subtleInk, fontSize: 13 }}>{label}</div>
    <div style={{ color: th.ink, fontSize: 14, lineHeight: 1.6 }}>{value}<Law text={law} th={th} /></div>
  </div>;
}
function Section({ id, title, th, children }) {
  return <section id={`rechtliches-${id}`} style={{ scrollMarginTop: 80, marginTop: 44 }}>
    <h2 style={{ color: th.ink, fontFamily: th.fontDisplay, fontSize: 24, fontWeight: 600, paddingBottom: 10, borderBottom: `1px solid ${th.lineColor}`, marginBottom: 14 }}>{title}</h2>
    {children}
  </section>;
}
export function LegalNotice({ lang, th, onMore }) {
  const P = legalPack(lang);
  return <p role="note" style={{ color: th.subtleInk, fontSize: 12.5, lineHeight: 1.7, maxWidth: 680, margin: "0 auto", textAlign: "center" }}>{P.notice} <button type="button" onClick={onMore} style={{ color: th.accent, textDecoration: "underline", textUnderlineOffset: 3, minHeight: 32 }}>{P.noticeMore}</button></p>;
}

export function LegalPage({ lang, appName, th, onBack, anchor, hashPrefix = "" }) {
  const P = legalPack(lang), I = P.imp, S = P.sections;
  const missing = legalMissingKeys();
  useEffect(() => {
    if (!anchor) { window.scrollTo(0, 0); return; }
    const el = document.getElementById(`rechtliches-${anchor}`);
    if (el) el.scrollIntoView({ block: "start" }); else window.scrollTo(0, 0);
  }, [anchor]);
  const onReq = { de: "Anschrift auf Anfrage per Mail", en: "Postal address on request by email", ar: "العنوان البريدي عند الطلب عبر البريد الإلكتروني" }[lang] || "";
  const addr = [LEGAL.name, LEGAL.profession, LEGAL.street, LEGAL.zipCity, LEGAL.country, !LEGAL.street && !LEGAL.zipCity ? onReq : ""].filter(Boolean);
  const go = id => { const el = document.getElementById(`rechtliches-${id}`); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); try { window.history.replaceState(null, "", `#${hashPrefix}rechtliches-${id}`); } catch (e) { /* sandboxed */ } };
  return <div style={{ maxWidth: 780, margin: "0 auto", padding: "32px 24px 80px", fontFamily: th.fontBody }}>
    <button type="button" onClick={onBack} style={{ color: th.subtleInk, fontSize: 14, minHeight: 44, display: "inline-flex", alignItems: "center", gap: 6 }}>{P.back}</button>
    <h1 style={{ color: th.ink, fontFamily: th.fontDisplay, fontSize: 34, fontWeight: 600, margin: "8px 0 10px" }}>{P.title}</h1>
    <p style={{ color: th.subtleInk, fontSize: 14, lineHeight: 1.7 }}>{fill(P.intro, lang, appName)}</p>
    <div role="note" style={{ margin: "18px 0", padding: "12px 16px", border: `1px solid ${th.lineColor}`, borderRadius: 6, color: th.ink, fontSize: 13.5, lineHeight: 1.7, background: th.cardBg }}>{P.notice}</div>
    <nav aria-label={P.title} style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "8px 0 4px" }}>
      {P.toc.map(([id, label]) => <button key={id} type="button" onClick={() => go(id)} style={{ minHeight: 40, padding: "0 14px", border: `1px solid ${th.lineColor}`, borderRadius: 999, color: th.ink, fontSize: 13 }}>{label}</button>)}
    </nav>

    <Section id="impressum" title={I.title} th={th}>
      {missing.length > 0 && <div role="alert" style={{ margin: "0 0 16px", padding: "14px 16px", border: "1px solid #C8553D", borderRadius: 6, color: th.ink, fontSize: 13.5, lineHeight: 1.7, background: th.cardBg }}>
        <strong>{I.missingTitle}</strong>
        <p style={{ margin: "6px 0" }}>{I.missing.replace("{list}", missing.map(k => I[k]).join(", "))}</p>
        <p style={{ margin: 0 }}>{I.alt}</p>
      </div>}
      <Row th={th} label={I.provider} value={addr.map((l, i) => <div key={i}>{l}</div>)} law={I.laws.provider} />
      <Row th={th} label={I.contact} value={<>{LEGAL.email && <div>{I.email}: {LEGAL.email}</div>}{LEGAL.phone && <div>{I.phone}: {LEGAL.phone}</div>}{!LEGAL.email && !LEGAL.phone && "n/a"}</>} law={I.laws.contact} />
      <Row th={th} label={I.responsible} value={<div>{LEGAL.name}{LEGAL.street && `, ${LEGAL.street}`}{LEGAL.zipCity && `, ${LEGAL.zipCity}`}</div>} law={I.laws.responsible} />
    </Section>

    {["datenschutz"].map(id => <Section key={id} id={id} title={S[id].title} th={th}><Blocks blocks={S[id].blocks} lang={lang} appName={appName} th={th} /></Section>)}

    <div role="note" style={{ marginTop: 44, padding: "14px 16px", border: `1px solid ${th.lineColor}`, borderRadius: 6, color: th.subtleInk, fontSize: 13, lineHeight: 1.7, background: th.cardBg }}>{P.final}</div>
  </div>;
}

export function ConsentBox({ lang, th, checked, onChange, onOpenLegal, error }) {
  const c = legalPack(lang).consent;
  return <div style={{ margin: "14px 0 6px" }}>
    <label style={{ display: "flex", gap: 10, alignItems: "flex-start", color: th.subtleInk, fontSize: 13, lineHeight: 1.6, cursor: "pointer", minHeight: 44 }}>
      <input type="checkbox" name="privacy-read" required checked={!!checked} onChange={e => onChange(e.target.checked)} aria-label={`${c.label} ${c.link}${c.labelEnd}`} aria-invalid={!!error} style={{ width: 22, height: 22, marginTop: 1, flexShrink: 0, accentColor: th.accent }} />
      <span>{c.label} <button type="button" onClick={onOpenLegal} style={{ color: th.accent, textDecoration: "underline", textUnderlineOffset: 3 }}>{c.link}</button>{c.labelEnd}</span>
    </label>
    {error && <p role="alert" style={{ color: "#C8553D", fontSize: 12, margin: "4px 0 0" }}>{error}</p>}
  </div>;
}

export function DataCenter({ lang, th, onExport, onDelete, armed, notice, demo, onLegal }) {
  const d = legalPack(lang).dc;
  const btn = { minHeight: 44, padding: "0 16px", border: `1px solid ${th.lineColor}`, borderRadius: 6, color: th.ink, fontSize: 13.5, display: "inline-flex", alignItems: "center", gap: 8 };
  return <section aria-labelledby="dc-title" style={{ marginTop: 40, padding: 20, border: `1px solid ${th.lineColor}`, borderRadius: 8, background: th.cardBg }}>
    <h3 id="dc-title" style={{ color: th.ink, fontFamily: th.fontDisplay, fontSize: 17, fontWeight: 600, marginBottom: 6 }}>{d.title}</h3>
    <p style={{ color: th.subtleInk, fontSize: 13, lineHeight: 1.6, marginBottom: 14 }}>{d.desc}{demo ? ` ${d.demoNote}` : ""}</p>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
      <button type="button" onClick={onExport} style={btn}>{d.export}<Law text={d.exportLaw} th={th} /></button>
      <button type="button" onClick={onDelete} style={{ ...btn, borderColor: armed ? "#C8553D" : th.lineColor, color: armed ? "#C8553D" : th.ink }}>{armed ? d.delSure : d.del}<Law text={d.delLaw} th={th} /></button>
      <button type="button" onClick={onLegal} style={{ ...btn, border: "none", textDecoration: "underline", textUnderlineOffset: 3 }}>{d.legal}</button>
    </div>
    {notice && <p role="status" style={{ color: th.accent, fontSize: 12.5, marginTop: 10 }}>{notice}</p>}
  </section>;
}

export function downloadJSON(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
