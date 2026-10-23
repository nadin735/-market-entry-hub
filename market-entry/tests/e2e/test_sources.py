import asyncio, sys
sys.path.insert(0,'.')
from playwright.async_api import async_playwright
from common import *
async def run(tool):
    async with async_playwright() as p:
        b=await p.chromium.launch(); ctx=await b.new_context(viewport={"width":1280,"height":900},locale="de-DE"); pg=await ctx.new_page()
        errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto(DEMO_URL); await pg.wait_for_timeout(1500); await demo_login(pg); await open_tool(pg,tool)
        if await pg.get_by_role("button",name="Neue Analyse").count(): await pg.get_by_role("button",name="Neue Analyse").click()
        await pg.get_by_test_id("try-testdata").click()
        await pg.get_by_role("button",name="Score berechnen").click(); await pg.wait_for_timeout(2500)
        for lang in ("DE","EN","AR"):
            if lang!="DE":
                await pg.get_by_role("button",name=lang,exact=True).first.click(); await pg.wait_for_timeout(700)
            check(f"{tool}/{lang}: jump button", await pg.get_by_test_id("sources-jump").count()==1)
            check(f"{tool}/{lang}: 2 source notes", await pg.get_by_test_id("source-note").count()==2)
            await pg.get_by_test_id("sources-jump").click(); await pg.wait_for_timeout(900)
            top=await pg.evaluate("()=>document.getElementById('ei-sources').getBoundingClientRect().top")
            check(f"{tool}/{lang}: jump lands on sources", -50<top<500, top)
            links=await pg.evaluate("()=>document.querySelectorAll('#ei-sources a[href^=http]').length")
            check(f"{tool}/{lang}: source links in section", links>=2, links)
            await pg.evaluate("window.scrollTo(0,0)")
        check(f"{tool}: no page errors", not errs, errs[:2])
        await b.close()
for t in ('gcc','europe'): asyncio.run(run(t))
finish()
