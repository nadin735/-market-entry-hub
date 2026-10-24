"""Both tools: test data button, analysis, result panels, EN/AR without German leftovers, no page errors."""
import asyncio
from playwright.async_api import async_playwright
from common import *

EXPECT = {"gcc": ("Nordlicht AI Systems GmbH", "UAE", "88/100"), "europe": ("Najm Wealth AI LLC", "UK", "84/100")}
# Source names, the demo banner and brand names may contain German words; everything else must be translated.
ALLOWED = re.compile(r"Demo Modus.*?nötig|Bundeszentralamt für Steuern|Läuft|nötig")


async def run(tool):
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 1280, "height": 900}, locale="de-DE")
        pg = await ctx.new_page()
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(DEMO_URL)
        await pg.wait_for_timeout(1500)
        await demo_login(pg)
        await open_tool(pg, tool)
        if await pg.get_by_role("button", name="Neue Analyse").count(): await pg.get_by_role("button", name="Neue Analyse").click()
        await pg.wait_for_timeout(500)
        await pg.get_by_test_id("try-testdata").click()
        vals = await pg.evaluate("()=>[...document.querySelectorAll('form input, form select')].map(e=>e.value)")
        company, market, score = EXPECT[tool]
        check(f"{tool}: test data fills every field", vals[0] == company and all(v != "" for v in vals), vals)
        await pg.get_by_role("button", name="Score berechnen").click()
        await pg.wait_for_timeout(2500)
        for tid in ("kpi-strip", "why-panel", "scoring-panel", "competitor-block", "sens-table", "live-ranking"):
            check(f"{tool}: result has {tid}", await pg.get_by_test_id(tid).count() >= 1)
        kpi = (await pg.get_by_test_id("kpi-strip").inner_text()).replace("\n", " ")
        check(f"{tool}: recommends {market} with {score}", market in kpi and score in kpi, kpi[:120])
        for lang in ("EN", "AR"):
            await pg.get_by_role("button", name=lang, exact=True).first.click()
            await pg.wait_for_timeout(800)
            body = await pg.inner_text("body")
            leaks = re.findall(r"\{[a-zA-Z]+\}|undefined|NaN", body)
            check(f"{tool}/{lang}: no placeholder leaks", not leaks, leaks[:5])
            de = sorted(set(m.group(0) for m in GERMAN.finditer(ALLOWED.sub("", body))))
            check(f"{tool}/{lang}: no German market text", not de, de[:10])
        check(f"{tool}: no page errors", not errs, errs[:3])
        await b.close()


for t in ("gcc", "europe"):
    asyncio.run(run(t))
finish()
