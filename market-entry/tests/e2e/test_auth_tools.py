import asyncio,os
from playwright.async_api import async_playwright
import test_auth_rest as A
from common import REAL_URL, DEMO_URL, finish
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        # a tool never shows its own login: with a session it opens straight on the dashboard
        m=A.Mock(); ctx,pg,errs=await A.mk(b,m,REAL_URL); d=A.sess(m)
        await pg.goto(REAL_URL+'#access_token='+d['access_token']+'&refresh_token='+d['refresh_token']); await pg.reload(); await pg.wait_for_timeout(800)
        await pg.evaluate("location.hash='#gcc'"); await pg.reload(); await pg.wait_for_timeout(4500)
        A.ok('tool: dashboard right away with an account session', await pg.get_by_role('button',name='Neue Analyse').count()==1)
        A.ok('tool: no login or register form anywhere', await pg.locator('input[name=email], input[name=password]').count()==0)
        await ctx.close()
        # demo build: direct link opens the tool without any login
        ctx,pg,errs=await A.mk(b,None,DEMO_URL); await pg.evaluate("location.hash='#gcc'"); await pg.reload(); await pg.wait_for_timeout(4500)
        A.ok('demo tool: direct link #gcc opens the tool without login', await pg.get_by_role('button',name=__import__('re').compile('Neue Analyse|New Analysis')).count()==1); await ctx.close()
        await b.close()
asyncio.run(main()); finish()
