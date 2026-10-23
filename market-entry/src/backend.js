// Supabase backend without SDK: plain fetch against the Supabase Auth and REST APIs.
// Only the public publishable key is used here; protection is enforced server side by
// Row Level Security (see supabase/schema.sql). Never put a service role key into this project.

/* ===== Configuration ===== */
// Public values (safe in the frontend). Overridable by build env vars or by localStorage (?setup=1).
const DEFAULT_SB = {
  url: "https://zovkeyyvtaevtkmymiqt.supabase.co",
  anonKey: "sb_publishable_nyXaVfrDVOydffspfZmKlQ_R6TEfIRk",
};

/* ===== Safe storage: falls back to memory when localStorage is blocked (file:// in Firefox) ===== */
const memLS = {};
export function safeLSGet(k) {
  try { return window.localStorage.getItem(k); } catch (e) { return Object.prototype.hasOwnProperty.call(memLS, k) ? memLS[k] : null; }
}
export function safeLSSet(k, v) {
  try { window.localStorage.setItem(k, v); } catch (e) { memLS[k] = v; }
}
export function safeLSDel(k) {
  try { window.localStorage.removeItem(k); } catch (e) { /* ignore */ }
  delete memLS[k];
}

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const IS_DEMO = import.meta.env.VITE_DEMO === "1" || safeLSGet("jast_demo") === "1";
export const sbConfig = () => ({
  url: String(safeLSGet("jast_sb_url") || envUrl || DEFAULT_SB.url).replace(/\/+$/, ""),
  anonKey: safeLSGet("jast_sb_key") || envKey || DEFAULT_SB.anonKey,
});
const cfg = sbConfig();
// Demo mode never talks to the network.
export const enabled = !IS_DEMO && Boolean(cfg.url && cfg.anonKey);

/* ===== Session storage and events ===== */
const K_TOKEN = "jast_token", K_REFRESH = "jast_refresh", K_USER = "jast_username";
const listeners = new Set();
function emit(ev, user) { listeners.forEach((f) => { try { f(ev, user || null); } catch (e) { /* ignore */ } }); }
function saveSession(s) {
  if (s.access_token) safeLSSet(K_TOKEN, s.access_token);
  if (s.refresh_token) safeLSSet(K_REFRESH, s.refresh_token);
  const u = s.user || null;
  if (u && u.email) safeLSSet(K_USER, u.email);
  if (u) userCache = { user: u, at: Date.now() };
}
function clearSession() {
  safeLSDel(K_TOKEN); safeLSDel(K_REFRESH); safeLSDel(K_USER);
  userCache = null;
}
let userCache = null;

/* ===== Low level request helper ===== */
class NetErr extends Error {}
async function call(path, { method = "GET", body, token, headers = {} } = {}) {
  let res;
  try {
    res = await fetch(cfg.url + path, {
      method,
      headers: {
        apikey: cfg.anonKey,
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (e) { throw new NetErr("network"); }
  let data = null;
  try { const txt = await res.text(); data = txt ? JSON.parse(txt) : null; } catch (e) { data = null; }
  return { ok: res.ok, status: res.status, data };
}
const errCode = (r) => (r.data && (r.data.error_code || r.data.code)) || "";
const errMsg = (r) => String((r.data && (r.data.msg || r.data.message || r.data.error_description || r.data.error)) || "").toLowerCase();

let refreshing = null;
/** Exchanges the refresh token once; resolves to a fresh access token or null. */
function refreshSession() {
  if (refreshing) return refreshing;
  const rt = safeLSGet(K_REFRESH);
  if (!rt) return Promise.resolve(null);
  refreshing = (async () => {
    try {
      const r = await call("/auth/v1/token?grant_type=refresh_token", { method: "POST", body: { refresh_token: rt } });
      if (r.ok && r.data && r.data.access_token) { saveSession(r.data); return r.data.access_token; }
      if (r.status === 400 || r.status === 401 || r.status === 403) clearSession(); // refresh token is dead
      return null;
    } catch (e) { return null; } // offline: keep the session, try again later
    finally { refreshing = null; }
  })();
  return refreshing;
}
/** Authenticated request: on 401 refresh once and retry. */
async function authed(path, opts = {}) {
  let token = safeLSGet(K_TOKEN);
  if (!token) token = await refreshSession();
  if (!token) return { ok: false, status: 401, data: null };
  let r = await call(path, { ...opts, token });
  if (r.status === 401) {
    const t = await refreshSession();
    if (t) r = await call(path, { ...opts, token: t });
  }
  return r;
}

// Client-side brute-force brake (the real rate limit is Supabase's Auth rate limits).
const LOCK_KEY = "auth_fail";
function lockState() {
  try { return JSON.parse(safeLSGet(LOCK_KEY) || "{}"); } catch { return {}; }
}
function setLock(s) { safeLSSet(LOCK_KEY, JSON.stringify(s)); }
export function lockedSeconds() {
  const s = lockState();
  return s.until && s.until > Date.now() ? Math.ceil((s.until - Date.now()) / 1000) : 0;
}
function registerFail() {
  const s = lockState();
  const n = (s.n || 0) + 1;
  setLock(n >= 5 ? { n: 0, until: Date.now() + 60_000 * Math.min(10, n - 4 || 1) } : { n, until: 0 });
}

// Generic result codes only; never reveal whether an e-mail exists.
const ok = (extra) => ({ ok: true, ...extra });
const fail = (code) => ({ ok: false, code });
function failFrom(r) {
  const c = errCode(r), m = errMsg(r);
  if (r.status === 429 || c.includes("rate_limit") || m.includes("rate limit")) return "rate";
  if (c === "weak_password" || (m.includes("password") && (m.includes("weak") || m.includes("least") || m.includes("short")))) return "weak";
  return "generic";
}

/* ===== Public auth API (same surface as before) ===== */
export async function signUp({ email, password, name }) {
  if (lockedSeconds()) return fail("locked");
  try {
    const r = await call("/auth/v1/signup?redirect_to=" + encodeURIComponent(window.location.origin), {
      method: "POST", body: { email, password, data: { name } },
    });
    if (r.ok) {
      if (r.data && r.data.access_token) { saveSession(r.data); emit("SIGNED_IN", r.data.user); } // confirmation switched off
      return ok({ confirm: true });
    }
    // Success and "already registered" look identical on purpose.
    if (errCode(r) === "user_already_exists") return ok({ confirm: true });
    return fail(failFrom(r));
  } catch (e) { return fail("network"); }
}
export async function signIn({ email, password }) {
  if (lockedSeconds()) return fail("locked");
  try {
    const r = await call("/auth/v1/token?grant_type=password", { method: "POST", body: { email, password } });
    if (r.ok && r.data && r.data.access_token) {
      saveSession(r.data); setLock({ n: 0, until: 0 }); emit("SIGNED_IN", r.data.user);
      return ok({ user: r.data.user });
    }
    if (errCode(r) === "email_not_confirmed" || errMsg(r).includes("not confirmed")) return fail("unconfirmed");
    if (r.status === 429) return fail("rate");
    registerFail();
    return fail("invalid");
  } catch (e) { return fail("network"); }
}
export async function signInOAuth(provider) {
  try {
    window.location.assign(cfg.url + "/auth/v1/authorize?provider=" + encodeURIComponent(provider) + "&redirect_to=" + encodeURIComponent(window.location.origin));
    return ok();
  } catch (e) { return fail("generic"); }
}
export async function resetPassword(email) {
  try { await call("/auth/v1/recover?redirect_to=" + encodeURIComponent(window.location.origin), { method: "POST", body: { email } }); } catch (e) { /* same answer */ }
  return ok(); // always the same answer
}
export async function updatePassword(password) {
  try {
    const r = await authed("/auth/v1/user", { method: "PUT", body: { password } });
    return r.ok ? ok() : fail(failFrom(r));
  } catch (e) { return fail("network"); }
}
export async function signOut() {
  const token = safeLSGet(K_TOKEN);
  clearSession();
  emit("SIGNED_OUT", null);
  if (token) { try { await call("/auth/v1/logout", { method: "POST", token }); } catch (e) { /* already signed out locally */ } }
}
/** Current user or null. Validates the token against Supabase; refreshes once when expired. */
export async function getUser() {
  if (userCache && Date.now() - userCache.at < 60_000 && safeLSGet(K_TOKEN)) return userCache.user;
  if (!safeLSGet(K_TOKEN) && !safeLSGet(K_REFRESH)) return null;
  try {
    const r = await authed("/auth/v1/user");
    if (r.ok && r.data && r.data.id) { userCache = { user: r.data, at: Date.now() }; return r.data; }
    if (r.status === 401 || r.status === 403) { clearSession(); }
    return null;
  } catch (e) { return null; }
}
export function onAuth(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
// Returning from an e-mail link or social login: tokens arrive in the URL hash.
(function readHashSession() {
  if (!enabled || typeof window === "undefined") return;
  const h = window.location.hash || "";
  if (!/access_token=/.test(h)) return;
  const p = new URLSearchParams(h.replace(/^#/, ""));
  if (!p.get("access_token")) return;
  saveSession({ access_token: p.get("access_token"), refresh_token: p.get("refresh_token") });
  try { window.history.replaceState(null, "", window.location.pathname + window.location.search); } catch (e) { /* ignore */ }
  const type = p.get("type");
  // Listeners attach after first render; deliver the event shortly after.
  setTimeout(async () => { const u = await getUser(); emit(type === "recovery" ? "PASSWORD_RECOVERY" : "SIGNED_IN", u); }, 0);
})();

// One account, two tools: the jsonb column holds {gcc: [...], europe: [...]}.
// A legacy plain array (single-tool era) is read as the current tool's list.
let currentTool = "gcc";
export function setTool(t) { currentTool = t; }
export function tool() { return currentTool; }
/** Storage-key namespace for the local demo mode (accounts are per tool there). */
export const ns = () => currentTool + ":";
async function loadRaw(uid) {
  const r = await authed("/rest/v1/user_data?select=analyses&user_id=eq." + encodeURIComponent(uid));
  if (!r.ok) throw new Error("load failed");
  return Array.isArray(r.data) && r.data[0] ? r.data[0].analyses : null;
}
export async function loadAnalyses(uid) {
  const raw = await loadRaw(uid);
  if (Array.isArray(raw)) return raw;
  return (raw && Array.isArray(raw[currentTool])) ? raw[currentTool] : [];
}
export async function saveAnalyses(uid, analyses) {
  const raw = await loadRaw(uid);
  const base = raw && !Array.isArray(raw) ? raw : {};
  const r = await authed("/rest/v1/user_data?on_conflict=user_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: { user_id: uid, analyses: { ...base, [currentTool]: analyses }, updated_at: new Date().toISOString() },
  });
  if (!r.ok) throw new Error("save failed");
}
export async function deleteAccount() {
  try {
    const r = await authed("/rest/v1/rpc/delete_my_account", { method: "POST", body: {} });
    if (!r.ok) return fail("generic");
  } catch (e) { return fail("network"); }
  await signOut();
  return ok();
}
// Session expiry on inactivity.
export function startIdleTimer(onIdle, ms = 30 * 60_000) {
  let t;
  const reset = () => { clearTimeout(t); t = setTimeout(onIdle, ms); };
  const ev = ["pointerdown", "keydown", "visibilitychange"];
  ev.forEach((e) => window.addEventListener(e, reset));
  reset();
  return () => { clearTimeout(t); ev.forEach((e) => window.removeEventListener(e, reset)); };
}

/* ===== Local demo mode (no Supabase): one shared account store for both tools =====
   Storage layout (same keys the tools always used): "accounts" = { key: { name, passwordHash,
   analyses_gcc: [...], analyses_europe: [...] } } and "session" = account key.
   The tools see only their own list as `analyses` (accountsGet/accountsSet translate). */
const LSP = "app_storage_";
const memStore = {};
const rd = k => { try { return localStorage.getItem(LSP + k); } catch (e) { return Object.prototype.hasOwnProperty.call(memStore, k) ? memStore[k] : null; } };
const wr = (k, v) => { try { localStorage.setItem(LSP + k, v); } catch (e) { memStore[k] = v; } };
const rm = k => { try { localStorage.removeItem(LSP + k); } catch (e) { delete memStore[k]; } };
const readAll = () => { try { return JSON.parse(rd("accounts") || "{}") || {}; } catch (e) { return {}; } };
export async function accountsGet() {
  const raw = rd("accounts");
  if (raw === null || raw === undefined) throw new Error("not found");
  const all = JSON.parse(raw), out = {};
  Object.keys(all).forEach(k => {
    const { analyses_gcc, analyses_europe, analyses, ...rest } = all[k];
    out[k] = { ...rest, analyses: all[k]["analyses_" + currentTool] || [] };
  });
  return { key: "accounts", value: JSON.stringify(out), shared: true };
}
export async function accountsSet(str) {
  const next = JSON.parse(str), shared = readAll(), out = {};
  Object.keys(next).forEach(k => {
    const { analyses, ...r } = next[k];
    out[k] = { ...(shared[k] || {}), ...r, ["analyses_" + currentTool]: analyses || [] };
    delete out[k].analyses;
  });
  wr("accounts", JSON.stringify(out));
  return { key: "accounts", value: str, shared: true };
}
function sha256Fallback(bytes) {
  const K = new Uint32Array([0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
  const H = new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]);
  const l = bytes.length, n = ((l + 9 + 63) >> 6) << 6, m = new Uint8Array(n);
  m.set(bytes); m[l] = 0x80;
  const dv = new DataView(m.buffer); dv.setUint32(n - 8, Math.floor(l * 8 / 0x100000000)); dv.setUint32(n - 4, (l * 8) >>> 0);
  const w = new Uint32Array(64), rr = (x, c) => (x >>> c) | (x << (32 - c));
  for (let o = 0; o < n; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
    for (let i = 16; i < 64; i++) { const a = rr(w[i - 15], 7) ^ rr(w[i - 15], 18) ^ (w[i - 15] >>> 3), b = rr(w[i - 2], 17) ^ rr(w[i - 2], 19) ^ (w[i - 2] >>> 10); w[i] = (w[i - 16] + a + w[i - 7] + b) | 0; }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0, t2 = ((rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
  }
  return Array.from(H).map(x => (x >>> 0).toString(16).padStart(8, "0")).join("");
}
async function hashPw(plain) {
  const bytes = new TextEncoder().encode(plain);
  if (!(window.crypto && window.crypto.subtle)) return sha256Fallback(bytes);
  const d = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(d)).map(b => b.toString(16).padStart(2, "0")).join("");
}
export function demoSession() {
  const key = rd("session"); if (!key) return null;
  const a = readAll()[key]; return a ? { key, name: a.name || key } : null;
}
export async function demoLogin(name, password) {
  const key = String(name || "").trim().toLowerCase(), a = readAll()[key];
  if (!key || !a || (a.passwordHash || a.password) !== await hashPw(password || "")) return fail("invalid");
  wr("session", key); return ok({ key, name: a.name || key });
}
export async function demoRegister(name, password) {
  const key = String(name || "").trim().toLowerCase(); if (!key || !password) return fail("required");
  const all = readAll(), ph = await hashPw(password);
  if (all[key]) { if ((all[key].passwordHash || all[key].password) === ph) { wr("session", key); return ok({ key, name: all[key].name || key }); } return fail("taken"); }
  all[key] = { passwordHash: ph, name: String(name).trim(), analyses_gcc: [], analyses_europe: [] };
  wr("accounts", JSON.stringify(all)); wr("session", key); return ok({ key, name: all[key].name });
}
export function demoLogout() { rm("session"); }

/** Demo mode only: any login works. Creates the local account on the fly or takes over the password. */
export async function demoEnsure(name, password) {
  const key = String(name || "").trim().toLowerCase(); if (!key) return fail("required");
  const all = readAll(), ph = await hashPw(password || "");
  if (all[key]) all[key].passwordHash = ph;
  else all[key] = { passwordHash: ph, name: String(name).trim(), analyses_gcc: [], analyses_europe: [] };
  delete all[key].password;
  wr("accounts", JSON.stringify(all)); wr("session", key); return ok({ key, name: all[key].name });
}
