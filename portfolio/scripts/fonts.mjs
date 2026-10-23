// Copies self-hosted fonts from @fontsource into ./fonts and writes fonts/fonts.css.
// Usage: npm install && npm run fonts   (then deploy the folder, fonts/ included)
import fs from "node:fs";
const spec = [
  ["inter", ["latin"], ["300", "400", "500", "600", "700"], ["normal"], "Inter"],
  ["noto-sans-arabic", ["arabic"], ["400", "500", "600", "700"], ["normal"], "Noto Sans Arabic"],
];
fs.mkdirSync("fonts", { recursive: true });
let css = "";
for (const [pkg, subsets, weights, styles, family] of spec)
  for (const sub of subsets) for (const w of weights) for (const st of styles) {
    const file = `${pkg}-${sub}-${w}-${st}.woff2`;
    const src = `node_modules/@fontsource/${pkg}/files/${file}`;
    if (!fs.existsSync(src)) { console.warn("missing", file); continue; }
    fs.copyFileSync(src, `fonts/${file}`);
    css += `@font-face{font-family:'${family}';font-style:${st};font-weight:${w};font-display:swap;src:url(${file}) format('woff2')}\n`;
  }
fs.writeFileSync("fonts/fonts.css", css);
console.log("fonts ready");
