"""Accessibility checks on hub, form and result of both tools (names, labels, landmarks, contrast, keyboard)."""
import asyncio, json
from playwright.async_api import async_playwright
from common import *

JS = r"""
() => {
  const vis=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'};
  const name=e=>(e.getAttribute('aria-label')||e.innerText||e.getAttribute('title')||e.getAttribute('alt')||'').trim();
  const out={};
  out.lang=document.documentElement.lang; out.main=document.querySelectorAll('main,[role=main]').length;
  out.h1=[...document.querySelectorAll('h1')].filter(vis).length;
  out.imgNoAlt=[...document.querySelectorAll('img')].filter(i=>vis(i)&&!i.hasAttribute('alt')).length;
  out.btnNoName=[...document.querySelectorAll('button,[role=button],a[href]')].filter(e=>vis(e)&&!name(e)&&!e.querySelector('img[alt]')).length;
  out.inputNoLabel=[...document.querySelectorAll('input,select,textarea')].filter(e=>vis(e)&&e.type!=='hidden'&&e.type!=='file'&&!e.getAttribute('aria-label')&&!(e.id&&document.querySelector('label[for="'+e.id+'"]'))&&!e.closest('label')).length;
  const lum=c=>{const a=c.map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)});return .2126*a[0]+.7152*a[1]+.0722*a[2]};
  const parse=s=>{const m=s.match(/rgba?\(([^)]+)\)/);if(!m)return null;const p=m[1].split(',').map(Number);return{r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1}};
  const bgOf=e=>{const layers=[];for(let n=e;n;n=n.parentElement){const c=parse(getComputedStyle(n).backgroundColor);if(c&&c.a>0){layers.push(c);if(c.a>=1)break}}let base={r:5,g:6,b:8};for(const c of layers.reverse()){base={r:base.r*(1-c.a)+c.r*c.a,g:base.g*(1-c.a)+c.g*c.a,b:base.b*(1-c.a)+c.b*c.a}}return base};
  let low=0;
  for(const e of document.querySelectorAll('body *')){ if(!vis(e)||e.closest('svg'))continue;
    const t=[...e.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim()).length; if(!t)continue;
    const s=getComputedStyle(e),fg=parse(s.color);if(!fg)continue;const bg=bgOf(e);
    const f=[fg.r*fg.a+bg.r*(1-fg.a),fg.g*fg.a+bg.g*(1-fg.a),fg.b*fg.a+bg.b*(1-fg.a)];
    const L1=lum(f),L2=lum([bg.r,bg.g,bg.b]);const cr=(Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05);
    const size=parseFloat(s.fontSize),bold=parseInt(s.fontWeight)>=700;if(cr<((size>=24||(size>=18.66&&bold))?3:4.5))low++;}
  out.lowContrast=low;
  // WCAG 2.2 target size (24px) for buttons; inline text links are exempt
  out.smallButtons=[...document.querySelectorAll('button,input,select')].filter(e=>vis(e)).filter(e=>{const r=e.getBoundingClientRect();return r.height<24||r.width<24}).length;
  return out;
}
"""


def verdict(label, r, need_h1=True):
    check(f"{label}: html lang set", r["lang"] in ("de", "en", "ar"), r["lang"])
    check(f"{label}: main landmark", r["main"] >= 1)
    if need_h1:
        check(f"{label}: exactly one visible h1", r["h1"] == 1, r["h1"])
    check(f"{label}: images have alt", r["imgNoAlt"] == 0)
    check(f"{label}: buttons and links have names", r["btnNoName"] == 0)
    check(f"{label}: inputs have labels", r["inputNoLabel"] == 0)
    check(f"{label}: text contrast >= 4.5:1", r["lowContrast"] == 0, r["lowContrast"])
    check(f"{label}: buttons >= 24px (WCAG 2.2)", r["smallButtons"] == 0, r["smallButtons"])


async def run(tool):
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 1280, "height": 900}, locale="de-DE")
        pg = await ctx.new_page()
        await pg.goto(DEMO_URL)
        await pg.wait_for_timeout(1500)
        if tool == "gcc":
            verdict("hub", await pg.evaluate(JS))
        await demo_login(pg)
        await open_tool(pg, tool)
        if await pg.get_by_role("button", name="Neue Analyse").count(): await pg.get_by_role("button", name="Neue Analyse").click()
        await pg.wait_for_timeout(500)
        verdict(f"{tool} form", await pg.evaluate(JS))
        # keyboard only: reach the test data button with Tab and press Enter
        await pg.evaluate("document.activeElement && document.activeElement.blur()")
        reached = False
        for _ in range(25):
            await pg.keyboard.press("Tab")
            if await pg.evaluate("document.activeElement && document.activeElement.getAttribute('data-testid')") == "try-testdata":
                reached = True
                break
        check(f"{tool}: test data button reachable with Tab", reached)
        if reached:
            await pg.keyboard.press("Enter")
            check(f"{tool}: Enter on test data fills the form", (await pg.locator("form input").first.input_value()) != "")
            fo = await pg.evaluate("(()=>{const e=document.querySelector('[data-testid=try-testdata]');e.focus();const s=getComputedStyle(e);return s.outlineStyle+' '+s.outlineWidth})()")
            check(f"{tool}: visible focus outline", "none" not in fo, fo)
        await pg.get_by_role("button", name="Score berechnen").click()
        await pg.wait_for_timeout(2500)
        verdict(f"{tool} result", await pg.evaluate(JS))
        await b.close()


for t in ("gcc", "europe"):
    asyncio.run(run(t))
finish()
