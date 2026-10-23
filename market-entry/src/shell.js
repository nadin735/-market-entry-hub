// Small plain DOM helpers outside React: demo banner and the connection panel (?setup=1).
import { IS_DEMO, sbConfig, safeLSGet, safeLSSet, safeLSDel } from "./backend.js";

function el(tag, style, text) {
  const e = document.createElement(tag);
  if (style) e.style.cssText = style;
  if (text) e.textContent = text;
  return e;
}

export function mountDemoBanner() {
  if (!IS_DEMO) return;
  const st = document.createElement("style");
  st.textContent = "@media print{#demo-banner{display:none!important}}";
  document.head.appendChild(st);
  const b = el("div", "background:#0B0D12;border-bottom:1px solid rgba(200,169,107,.35);color:#C8A96B;font:500 12px/28px Inter,'Noto Sans Arabic',system-ui,sans-serif;text-align:center;letter-spacing:.04em;height:28px;overflow:hidden", "Demo Modus · Läuft offline, kein Konto nötig");
  b.id = "demo-banner";
  b.setAttribute("role", "status");
  document.body.insertBefore(b, document.body.firstChild);
}

export function mountSetupPanel() {
  // Off by default in production. Enable with VITE_ENABLE_SETUP=1 at build time.
  if (IS_DEMO || import.meta.env.VITE_ENABLE_SETUP !== "1" || !/[?&]setup=1\b/.test(window.location.search)) return;
  const cfg = sbConfig();
  const wrap = el("div", "position:fixed;inset:0;z-index:99999;background:rgba(5,6,8,.82);display:flex;align-items:center;justify-content:center;padding:16px;font-family:Inter,system-ui,sans-serif");
  wrap.setAttribute("data-testid", "setup-panel");
  const box = el("div", "width:100%;max-width:440px;background:#0B0D12;color:#EDEAE2;border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:22px");
  box.appendChild(el("h2", "margin:0 0 4px;font-size:17px;font-weight:500", "Verbindung"));
  box.appendChild(el("p", "margin:0 0 12px;font-size:13px;color:#A5A8B2", "Supabase URL und Key für diesen Browser."));
  const field = (label, val) => {
    box.appendChild(el("label", "display:block;font-size:12.5px;color:#A5A8B2;margin:10px 0 4px", label));
    const i = el("input", "width:100%;box-sizing:border-box;min-height:42px;padding:0 10px;border-radius:8px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);color:#EDEAE2;font-size:14px");
    i.value = val; i.autocomplete = "off"; i.spellcheck = false; box.appendChild(i); return i;
  };
  const iu = field("URL", cfg.url), ik = field("Key", cfg.anonKey);
  const msg = el("p", "min-height:18px;margin:10px 0 0;font-size:13px;color:#A5A8B2");
  msg.setAttribute("role", "status");
  const row = el("div", "display:flex;gap:8px;flex-wrap:wrap;margin-top:12px");
  const btn = (label, primary, fn) => {
    const b = el("button", "min-height:42px;padding:0 14px;border-radius:4px;font-size:13.5px;cursor:pointer;" + (primary ? "background:#C8A96B;color:#0B0D12;border:0;font-weight:600" : "background:transparent;color:#EDEAE2;border:1px solid rgba(255,255,255,.2)"), label);
    b.type = "button"; b.addEventListener("click", fn); row.appendChild(b); return b;
  };
  const clean = () => ({ url: iu.value.trim().replace(/\/+$/, ""), key: ik.value.trim() });
  const leave = () => { window.location.assign(window.location.pathname + window.location.hash); };
  btn("Prüfen", false, async () => {
    const c = clean(); msg.textContent = "…";
    try {
      const r = await fetch(c.url + "/auth/v1/health", { headers: { apikey: c.key } });
      msg.textContent = r.ok ? "Verbindung ok" : "Antwort " + r.status + ". URL oder Key prüfen.";
    } catch (e) { msg.textContent = "Keine Verbindung."; }
  });
  btn("Speichern", true, () => { const c = clean(); if (!/^https:\/\//.test(c.url) || !c.key) { msg.textContent = "Bitte URL (https) und Key eintragen."; return; } safeLSSet("jast_sb_url", c.url); safeLSSet("jast_sb_key", c.key); leave(); });
  btn("Zurücksetzen", false, () => { safeLSDel("jast_sb_url"); safeLSDel("jast_sb_key"); leave(); });
  btn("Schließen", false, leave);
  box.appendChild(msg); box.appendChild(row); wrap.appendChild(box); document.body.appendChild(wrap);
}
