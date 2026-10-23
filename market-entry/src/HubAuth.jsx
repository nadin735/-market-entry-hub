import React, { useState } from "react";
import * as backend from "./backend.js";
import { ConsentBox, legalPack } from "./legal.jsx";

const TX = {
  de: { unconfirmed: "Mail noch nicht bestätigt. Bitte den Link in der Mail öffnen.", network: "Keine Verbindung. Bitte Netz prüfen.", title: "Ein Login für beide Tools", login: "Anmelden", register: "Konto erstellen", name: "Name", email: "E-Mail", pw: "Passwort", switchReg: "Noch kein Konto? Konto erstellen", switchLogin: "Schon ein Konto? Anmelden", invalid: "Anmeldung nicht möglich. Bitte Eingaben prüfen.", required: "Bitte alle Felder ausfüllen.", taken: "Dieser Name ist vergeben (anderes Passwort).", weak: "Passwort: mindestens 10 Zeichen.", confirm: "Fast geschafft: Wir haben dir eine Bestätigungs-E-Mail geschickt. Bitte bestätige sie und melde dich dann an.", locked: "Zu viele Versuche. Bitte kurz warten.", generic: "Das hat nicht geklappt. Bitte später erneut versuchen.", close: "Schließen", demo: "Demo Modus: Jedes Login funktioniert. Daten bleiben in diesem Browser." },
  en: { unconfirmed: "Email not confirmed yet. Please open the link in the email.", network: "No connection. Please check your network.", title: "One login for both tools", login: "Sign in", register: "Create account", name: "Name", email: "Email", pw: "Password", switchReg: "No account yet? Create one", switchLogin: "Already have an account? Sign in", invalid: "Could not sign in. Please check your details.", required: "Please fill in all fields.", taken: "This name is taken (different password).", weak: "Password: at least 10 characters.", confirm: "Almost done: we sent you a confirmation email. Please confirm it, then sign in.", locked: "Too many attempts. Please wait a moment.", generic: "That did not work. Please try again later.", close: "Close", demo: "Demo mode: any login works. Data stays in this browser." },
  ar: { unconfirmed: "لم يتم تأكيد البريد بعد. افتح الرابط في الرسالة.", network: "لا يوجد اتصال. تحقق من الشبكة.", title: "تسجيل دخول واحد للأداتين", login: "تسجيل الدخول", register: "إنشاء حساب", name: "الاسم", email: "البريد الإلكتروني", pw: "كلمة المرور", switchReg: "ليس لديك حساب؟ أنشئ حسابًا", switchLogin: "لديك حساب؟ سجّل الدخول", invalid: "تعذّر تسجيل الدخول. تحقق من البيانات.", required: "يرجى تعبئة جميع الحقول.", taken: "هذا الاسم مستخدم (بكلمة مرور مختلفة).", weak: "كلمة المرور: 10 أحرف على الأقل.", confirm: "اقتربت من الإنهاء: أرسلنا لك بريد تأكيد. أكده ثم سجّل الدخول.", locked: "محاولات كثيرة. انتظر قليلًا.", generic: "لم تنجح العملية. حاول لاحقًا.", close: "إغلاق", demo: "وضع تجريبي: أي تسجيل دخول يعمل. تبقى البيانات في هذا المتصفح." }
};

export default function HubAuth({ lang, th, onDone, onClose, onLegal }) {
  const T = TX[lang];
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ name: "", email: "", pw: "" });
  const [consent, setConsent] = useState(false);
  const [err, setErr] = useState(""), [note, setNote] = useState(""), [busy, setBusy] = useState(false);
  const sb = backend.enabled, reg = mode === "register";
  const msg = c => c === "locked" ? T.locked : c === "unconfirmed" ? T.unconfirmed : c === "network" ? T.network : c === "weak" ? T.weak : c === "taken" ? T.taken : c === "required" ? T.required : c === "invalid" ? T.invalid : T.generic;
  async function submit(e) {
    e.preventDefault(); if (busy) return; setErr(""); setNote("");
    const fd = new FormData(e.currentTarget);
    const v = { name: String(fd.get("name") || f.name).trim(), email: String(fd.get("email") || f.email).trim(), pw: String(fd.get("pw") || f.pw) };
    if (reg && !consent) { setErr(legalPack(lang).consent.error); return; }
    if ((sb ? !v.email : !v.name) || !v.pw || (reg && sb && !v.name)) { setErr(T.required); return; }
    setBusy(true);
    try {
      let r;
      if (sb) {
        if (reg) { if (v.pw.length < 10) { setErr(T.weak); return; } r = await backend.signUp({ email: v.email, password: v.pw, name: v.name }); if (r.ok) { setNote(T.confirm); setMode("login"); return; } }
        else r = await backend.signIn({ email: v.email, password: v.pw });
      } else r = backend.IS_DEMO ? await backend.demoEnsure(v.name, v.pw) : reg ? await backend.demoRegister(v.name, v.pw) : await backend.demoLogin(v.name, v.pw);
      if (r.ok) onDone(); else setErr(msg(r.code));
    } catch (x) { setErr(T.generic); } finally { setBusy(false); }
  }
  const inp = { width: "100%", boxSizing: "border-box", minHeight: 44, padding: "0 12px", borderRadius: 8, border: `1px solid ${th.lineColor}`, background: "rgba(255,255,255,0.04)", color: th.ink, fontSize: 15, fontFamily: th.fontBody };
  const lab = { display: "block", fontSize: 12.5, color: th.subtleInk, margin: "12px 0 4px" };
  return <form onSubmit={submit} data-testid="hub-auth" style={{ maxWidth: 420, margin: "0 auto 36px", padding: 24, borderRadius: 16, border: `1px solid ${th.lineColor}`, background: th.cardBg }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500, color: th.ink }}>{T.title}</h2>
      <button type="button" onClick={onClose} style={{ color: th.subtleInk, fontSize: 13, minHeight: 44 }}>{T.close} ✕</button>
    </div>
    <p style={{ color: th.subtleInk, fontSize: 13, margin: "6px 0 0" }}>{reg ? T.register : T.login}{!sb ? " · " + T.demo : ""}</p>
    {sb ? <>
      {reg && <><label style={lab} htmlFor="ha-name">{T.name}</label><input id="ha-name" name="name" autoComplete="name" style={inp} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></>}
      <label style={lab} htmlFor="ha-email">{T.email}</label><input id="ha-email" name="email" type="email" autoComplete="email" style={inp} value={f.email} onChange={e => setF({ ...f, email: e.target.value })} />
    </> : <><label style={lab} htmlFor="ha-name">{T.name}</label><input id="ha-name" name="name" autoComplete="username" style={inp} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></>}
    <label style={lab} htmlFor="ha-pw">{T.pw}</label><input id="ha-pw" name="pw" type="password" autoComplete={reg ? "new-password" : "current-password"} style={inp} value={f.pw} onChange={e => setF({ ...f, pw: e.target.value })} />
    {reg && <ConsentBox lang={lang} th={th} checked={consent} onChange={setConsent} onOpenLegal={onLegal} error={""} />}
    {err && <p role="alert" style={{ color: "#C8553D", fontSize: 13, margin: "10px 0 0" }}>{err}</p>}
    {note && <p role="status" style={{ color: th.accent, fontSize: 13, margin: "10px 0 0" }}>{note}</p>}
    <button type="submit" disabled={busy} style={{ marginTop: 16, width: "100%", minHeight: 46, borderRadius: 4, background: th.accent, color: "#0B0D12", fontWeight: 600, fontSize: 15, opacity: busy ? 0.6 : 1 }}>{reg ? T.register : T.login}</button>
    <button type="button" onClick={() => { setMode(reg ? "login" : "register"); setErr(""); setNote(""); }} style={{ marginTop: 6, width: "100%", minHeight: 44, color: th.subtleInk, fontSize: 13, textDecoration: "underline", textUnderlineOffset: 3 }}>{reg ? T.switchLogin : T.switchReg}</button>
  </form>;
}
