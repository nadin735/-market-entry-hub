import React, { useState } from "react";
import * as backend from "./backend.js";
import { ConsentBox, legalPack } from "./legal.jsx";

const TX = {
  de: { title: "Mit Konto anmelden", sub: "Ihre Analysen werden gespeichert und stehen in beiden Tools bereit.", login: "Anmelden", register: "Konto erstellen", toReg: "Noch kein Konto? Konto erstellen", toLogin: "Schon ein Konto? Anmelden", name: "Name", email: "Mailadresse", pw: "Passwort (mindestens 10 Zeichen)", close: "Schließen", network: "Keine Verbindung. Bitte Netz prüfen.", generic: "Das hat nicht geklappt. Bitte versuchen Sie es erneut.", required: "Bitte alle Felder ausfüllen.", weak: "Bitte ein Passwort mit mindestens 10 Zeichen verwenden.", taken: "Diese Mailadresse ist bereits registriert.", invalid: "Anmeldung nicht möglich. Mailadresse oder Passwort stimmt nicht.", unconfirmed: "Mailadresse noch nicht bestätigt. Bitte den Link in der Mail öffnen.", locked: "Zu viele Fehlversuche. Bitte warten Sie eine Minute.", confirm: "Fast geschafft: Wir haben Ihnen eine Bestätigungsmail geschickt. Bitte bestätigen Sie sie und melden Sie sich dann an.", forgot: "Passwort vergessen?", forgotSent: "Falls ein Konto existiert, ist eine Mail zum Zurücksetzen unterwegs." },
  en: { title: "Sign in with an account", sub: "Your analyses are saved and available in both tools.", login: "Sign in", register: "Create account", toReg: "No account yet? Create one", toLogin: "Already have an account? Sign in", name: "Name", email: "Email", pw: "Password (at least 10 characters)", close: "Close", network: "No connection. Please check your network.", generic: "That did not work. Please try again.", required: "Please fill in all fields.", weak: "Please use a password with at least 10 characters.", taken: "This email is already registered.", invalid: "Sign in failed. Email or password is wrong.", unconfirmed: "Email not confirmed yet. Please open the link in the email.", locked: "Too many failed attempts. Please wait a minute.", confirm: "Almost done: we sent you a confirmation email. Please confirm it and then sign in.", forgot: "Forgot password?", forgotSent: "If an account exists, a reset email is on its way." },
  ar: { title: "تسجيل الدخول بحساب", sub: "تُحفظ تحليلاتك وتتوفر في الأداتين.", login: "تسجيل الدخول", register: "إنشاء حساب", toReg: "ليس لديك حساب؟ أنشئ حسابًا", toLogin: "لديك حساب؟ سجّل الدخول", name: "الاسم", email: "البريد الإلكتروني", pw: "كلمة المرور (10 أحرف على الأقل)", close: "إغلاق", network: "لا يوجد اتصال. تحقق من الشبكة.", generic: "لم تنجح العملية. حاول مرة أخرى.", required: "يرجى ملء كل الحقول.", weak: "استخدم كلمة مرور من 10 أحرف على الأقل.", taken: "هذا البريد مسجّل بالفعل.", invalid: "تعذّر تسجيل الدخول. البريد أو كلمة المرور غير صحيحة.", unconfirmed: "لم يتم تأكيد البريد بعد. افتح الرابط في الرسالة.", locked: "محاولات فاشلة كثيرة. انتظر دقيقة.", confirm: "اقتربت من الانتهاء: أرسلنا لك رسالة تأكيد. أكّدها ثم سجّل الدخول.", forgot: "نسيت كلمة المرور؟", forgotSent: "إن وُجد حساب فستصلك رسالة لإعادة التعيين." }
};

export default function HubAuth({ lang, th, onDone, onClose, onLegal }) {
  const T = TX[lang];
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ name: "", email: "", pw: "" });
  const [consent, setConsent] = useState(false);
  const [err, setErr] = useState(""), [note, setNote] = useState(""), [busy, setBusy] = useState(false);
  const reg = mode === "register";
  const msg = c => T[c] && ["locked", "unconfirmed", "network", "weak", "taken", "required", "invalid"].includes(c) ? T[c] : T.generic;
  async function submit(e) {
    e.preventDefault(); if (busy) return; setErr(""); setNote("");
    const fd = new FormData(e.currentTarget);
    const v = { name: String(fd.get("name") || f.name).trim(), email: String(fd.get("email") || f.email).trim(), pw: String(fd.get("pw") || f.pw) };
    if (!v.email || !v.pw || (reg && !v.name)) { setErr(T.required); return; }
    if (reg && !consent) { setErr(legalPack(lang).consent.error); return; }
    if (reg && v.pw.length < 10) { setErr(T.weak); return; }
    setBusy(true);
    try {
      const r = reg ? await backend.signUp({ email: v.email, password: v.pw, name: v.name }) : await backend.signIn({ email: v.email, password: v.pw });
      if (r.ok) { if (reg && !r.session && !(await backend.getUser())) { setNote(T.confirm); setMode("login"); } else onDone(); }
      else setErr(msg(r.code));
    } catch (x) { setErr(T.generic); } finally { setBusy(false); }
  }
  async function forgot() {
    if (!f.email.trim()) { setErr(T.required); return; }
    await backend.resetPassword(f.email.trim()); setErr(""); setNote(T.forgotSent);
  }
  const inp = { width: "100%", boxSizing: "border-box", minHeight: 44, padding: "0 12px", borderRadius: 8, border: `1px solid ${th.lineColor}`, background: "transparent", color: th.ink, fontSize: 15, fontFamily: th.fontBody };
  const lab = { display: "block", fontSize: 12.5, color: th.subtleInk, margin: "12px 0 4px" };
  return <form onSubmit={submit} data-testid="hub-auth" style={{ maxWidth: 420, margin: "0 0 28px", padding: 24, borderRadius: 16, border: `1px solid ${th.lineColor}`, background: th.cardBg }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500, color: th.ink }}>{T.title}</h2>
      {onClose && <button type="button" onClick={onClose} style={{ color: th.subtleInk, fontSize: 13, minHeight: 44 }}>{T.close}</button>}
    </div>
    <p style={{ color: th.subtleInk, fontSize: 13, margin: "6px 0 0" }}>{T.sub}</p>
    {reg && <><label style={lab} htmlFor="ha-name">{T.name}</label><input id="ha-name" name="name" autoComplete="name" style={inp} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></>}
    <label style={lab} htmlFor="ha-email">{T.email}</label><input id="ha-email" name="email" type="email" autoComplete="email" style={inp} value={f.email} onChange={e => setF({ ...f, email: e.target.value })} />
    <label style={lab} htmlFor="ha-pw">{T.pw}</label><input id="ha-pw" name="pw" type="password" autoComplete={reg ? "new-password" : "current-password"} style={inp} value={f.pw} onChange={e => setF({ ...f, pw: e.target.value })} />
    {reg && <ConsentBox lang={lang} th={th} checked={consent} onChange={setConsent} onOpenLegal={onLegal} error={""} />}
    {err && <p role="alert" style={{ color: "#C8553D", fontSize: 13, margin: "10px 0 0" }}>{err}</p>}
    {note && <p role="status" style={{ color: th.accent, fontSize: 13, margin: "10px 0 0" }}>{note}</p>}
    <button type="submit" disabled={busy} style={{ marginTop: 16, width: "100%", minHeight: 46, borderRadius: 4, background: th.accent, color: "#0B0D12", fontWeight: 600, fontSize: 15, opacity: busy ? 0.6 : 1 }}>{reg ? T.register : T.login}</button>
    <button type="button" onClick={() => { setMode(reg ? "login" : "register"); setErr(""); setNote(""); }} style={{ marginTop: 6, width: "100%", minHeight: 44, color: th.subtleInk, fontSize: 13, textDecoration: "underline", textUnderlineOffset: 3 }}>{reg ? T.toLogin : T.toReg}</button>
    {!reg && <button type="button" onClick={forgot} style={{ width: "100%", minHeight: 44, color: th.subtleInk, fontSize: 13 }}>{T.forgot}</button>}
  </form>;
}
