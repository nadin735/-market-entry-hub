import asyncio,os
from playwright.async_api import async_playwright
import test_auth_rest as A
from common import REAL_URL, DEMO_URL, finish
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        # real build, tool-level login, unconfirmed
        m=A.Mock(confirm=True); m.users['x@y.de']={'id':'u9','email':'x@y.de','pw':'LangesPasswort1','meta':{'name':'X'},'ok':False}
        ctx,pg,errs=await A.mk(b,m,REAL_URL); await pg.evaluate("location.hash='#gcc'"); await pg.reload(); await pg.wait_for_timeout(4500)
        await pg.get_by_role('button',name='Anmelden').first.click(); await pg.wait_for_timeout(600)
        await pg.locator('input[name=email]').fill('x@y.de'); await pg.locator('input[name=password]').fill('LangesPasswort1'); await pg.locator('button.sb-btn[type=submit]').click(); await pg.wait_for_timeout(900)
        t=await pg.inner_text('body'); A.ok('tool login: unconfirmed text', 'noch nicht bestätigt' in t)
        m.users['x@y.de']['ok']=True; await pg.locator('button.sb-btn[type=submit]').click(); await pg.wait_for_timeout(1500)
        A.ok('tool login: dashboard after confirm', await pg.get_by_role('button',name='Neue Analyse').count()==1); await ctx.close()
        # demo build: direct link opens the tool without any login
        ctx,pg,errs=await A.mk(b,None,DEMO_URL); await pg.evaluate("location.hash='#gcc'"); await pg.reload(); await pg.wait_for_timeout(4500)
        A.ok('demo tool: direct link #gcc opens the tool without login', await pg.get_by_role('button',name=__import__('re').compile('Neue Analyse|New Analysis')).count()==1); await ctx.close()
        await b.close()
asyncio.run(main()); finish()
