// Shared light/dark preference for hub and both tools. Stored under "ui_theme"; defaults to dark.
export function readTheme() {
  try { const v = window.localStorage.getItem("ui_theme"); if (v === "dark" || v === "light") return v === "dark"; } catch (e) { /* storage blocked */ }
  return true;
}
export function writeTheme(dark) {
  try { window.localStorage.setItem("ui_theme", dark ? "dark" : "light"); } catch (e) { /* ignore */ }
}
