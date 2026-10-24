import React, { useState } from "react";
import * as backend from "./backend.js";
import { ConsentBox, legalPack } from "./legal.jsx";

const TX = {
  de: { title: "Anmelden", sub: "Ein Konto für beide Tools. Die Anmeldung erfolgt über Ihr Google Konto.", google: "Weiter mit Google", close: "Schließen", network: "Keine Verbindung. Bitte Netz prüfen.", generic: "Das hat nicht geklappt. Bitte versuchen Sie es erneut.", skip: "Sie können die Tools auch ohne Anmeldung ansehen." },
  en: { title: "Sign in", sub: "One account for both tools. Sign in with your Google account.", google: "Continue with Google", close: "Close", network: "No connection. Please check your network.", generic: "That did not work. Please try again.", skip: "You can also view the tools without signing in." },
  ar: { title: "تسجيل الدخول", sub: "حساب واحد للأداتين. سجّل الدخول عبر حساب Google.", google: "المتابعة عبر Google", close: "إغلاق", network: "لا يوجد اتصال. تحقق من الشبكة.", generic: "لم تنجح العملية. حاول مرة أخرى.", skip: "يمكنك أيضًا استعراض الأداتين دون تسجيل الدخول." }
};

export default function HubAuth({ lang, th, onClose, onLegal }) {
  const T = TX[lang];
  const [consent, setConsent] = useState(false);
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  async function go() {
    if (busy) return; setErr("");
    if (!consent) { setErr(legalPack(lang).consent.error); return; }
    setBusy(true);
    const r = await backend.signInOAuth("google");
    if (!r.ok) { setErr(r.code === "network" ? T.network : T.generic); setBusy(false); }
  }
  return <div data-testid="hub-auth" style={{ maxWidth: 420, margin: "0 auto 36px", padding: 24, borderRadius: 16, border: `1px solid ${th.lineColor}`, background: th.cardBg }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500, color: th.ink }}>{T.title}</h2>
      <button type="button" onClick={onClose} style={{ color: th.subtleInk, fontSize: 13, minHeight: 44 }}>{T.close} ✕</button>
    </div>
    <p style={{ color: th.subtleInk, fontSize: 13.5, lineHeight: 1.6, margin: "6px 0 14px" }}>{T.sub}</p>
    <ConsentBox lang={lang} th={th} checked={consent} onChange={v => { setConsent(v); if (v) setErr(""); }} onOpenLegal={onLegal} error={""} />
    {err && <p role="alert" style={{ color: "#C8553D", fontSize: 13, margin: "10px 0 0" }}>{err}</p>}
    <button type="button" data-testid="hub-google" onClick={go} disabled={busy} style={{ marginTop: 16, width: "100%", minHeight: 46, borderRadius: 4, background: th.accent, color: "#0B0D12", fontWeight: 600, fontSize: 15, opacity: busy ? 0.6 : 1 }}>{T.google}</button>
    <p style={{ color: th.subtleInk, fontSize: 12.5, margin: "12px 0 0", textAlign: "center" }}>{T.skip}</p>
  </div>;
}
