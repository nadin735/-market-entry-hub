import asyncio,os
from playwright.async_api import async_playwright
import test_auth_rest as A
from common import REAL_URL, DEMO_URL, finish
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        # real build, tool-level login: Google only
        m=A.Mock()
        ctx,pg,errs=await A.mk(b,m,REAL_URL); await pg.evaluate("location.hash='#gcc'"); await pg.reload(); await pg.wait_for_timeout(4500)
        await pg.get_by_role('button',name='Anmelden').first.click(); await pg.wait_for_timeout(600)
        A.ok('tool login: no email/password fields', await pg.locator('input[name=email], input[name=password]').count()==0)
        A.ok('tool login: Google button, no Apple/GitHub', await pg.get_by_test_id('tool-google').count()==1 and 'Apple' not in await pg.inner_text('body') and 'GitHub' not in await pg.inner_text('body'))
        await pg.get_by_test_id('tool-google').click(); await pg.wait_for_timeout(400)
        A.ok('tool login: consent required first', 'Datenschutz' in await pg.inner_text('body'))
        urls=[]
        await ctx.route('**/auth/v1/authorize**',lambda r:(urls.append(r.request.url), r.abort())[1])
        await pg.get_by_role('checkbox').check(); await pg.get_by_test_id('tool-google').click(); await pg.wait_for_timeout(600)
        A.ok('tool login: goes to Supabase with provider=google', any('provider=google' in u for u in urls), urls)
        await ctx.close()
        # coming back from Google while the tool is open
        m=A.Mock(); ctx,pg,errs=await A.mk(b,m,REAL_URL); d=A.sess(m)
        await pg.goto(REAL_URL+'#access_token='+d['access_token']+'&refresh_token='+d['refresh_token']); await pg.reload(); await pg.wait_for_timeout(800); await pg.evaluate("location.hash='#gcc'"); await pg.reload(); await pg.wait_for_timeout(4500)
        A.ok('tool: dashboard after Google sign in', await pg.get_by_role('button',name='Neue Analyse').count()==1); await ctx.close()
        # demo build: direct link opens the tool without any login
        ctx,pg,errs=await A.mk(b,None,DEMO_URL); await pg.evaluate("location.hash='#gcc'"); await pg.reload(); await pg.wait_for_timeout(4500)
        A.ok('demo tool: direct link #gcc opens the tool without login', await pg.get_by_role('button',name=__import__('re').compile('Neue Analyse|New Analysis')).count()==1); await ctx.close()
        await b.close()
asyncio.run(main()); finish()
