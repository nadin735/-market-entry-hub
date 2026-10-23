import asyncio, os, sys
from playwright.async_api import async_playwright
n=sys.argv[1]; only=sys.argv[2:] 
BLOCK_STORAGE="""const t=()=>{throw new DOMException('denied','SecurityError')};['getItem','setItem','removeItem','clear'].forEach(m=>{Storage.prototype[m]=t});"""
NO_SUBTLE="""Object.defineProperty(window.crypto,'subtle',{value:undefined,configurable:true});"""
SC={
 'desktop':dict(vp=(1440,900)),
 'ipad':dict(vp=(820,1180),touch=True,ua='Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'),
 'storage_blocked':dict(vp=(1280,800),init=BLOCK_STORAGE),
 'no_crypto_subtle':dict(vp=(1280,800),init=NO_SUBTLE),
 'autofill_no_events':dict(vp=(1280,800),autofill=True),
 'phone':dict(vp=(390,844),touch=True),
 'double_click':dict(vp=(1280,800),dbl=True),
}
async def run(p,name,c):
    b=await p.chromium.launch(); kw=dict(viewport={'width':c['vp'][0],'height':c['vp'][1]})
    if c.get('touch'): kw.update(has_touch=True,is_mobile=True)
    if c.get('ua'): kw['user_agent']=c['ua']
    ctx=await b.new_context(**kw)
    if c.get('init'): await ctx.add_init_script(c['init'])
    pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto('file://'+os.path.abspath(f'demo_{n}_final.html')); await pg.wait_for_timeout(4300)
    tap=(lambda l: l.tap()) if c.get('touch') else (lambda l: l.click())
    await tap(pg.get_by_role('button',name='DE',exact=True)); await pg.wait_for_timeout(400)
    await tap(pg.get_by_role('button',name='Konto erstellen').first); await pg.wait_for_timeout(500)
    user,pw=f'Tester {name}','Passwort-123!'
    inputs=pg.locator('form input')
    await pg.get_by_role('checkbox',name='Datenschutz').check()
    if c.get('autofill'):
        await pg.evaluate("""([u,p])=>{const f=document.querySelector('form');const set=(el,v)=>{const d=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');d.set.call(el,v)};set(f.querySelector('input[name=username]'),u);set(f.querySelector('input[name=password]'),p);}""",[user,pw])
        await pg.locator('form input[name=password]').press('Enter')
    else:
        await inputs.nth(0).fill(user); await inputs.nth(1).fill(pw)
        btn=pg.locator('form button[type=submit]')
        await tap(btn)
        if c.get('dbl'): await btn.click(force=True,timeout=500) if await btn.count() else None
    await pg.wait_for_timeout(2200)
    body=lambda: pg.inner_text('body')
    ok1='Deine Analysen' in await body()
    ok2=ok3=ok4=True
    if ok1:
        # logout -> login
        await tap(pg.locator('header button, nav button').last) if False else None
        await pg.evaluate("document.querySelector('header')&&0")
        lo=pg.get_by_role('button',name='Abmelden')
        if await lo.count(): await tap(lo.first)
        else: await tap(pg.locator('button:has(svg)').last)
        await pg.wait_for_timeout(900)
        await tap(pg.get_by_role('button',name='Anmelden').first); await pg.wait_for_timeout(500)
        inputs=pg.locator('form input'); await inputs.nth(0).fill(user); await inputs.nth(1).fill('falsch-falsch')
        await tap(pg.locator('form button[type=submit]')); await pg.wait_for_timeout(1200)
        ok3='Deine Analysen' not in await body()
        await inputs.nth(1).fill(pw); await tap(pg.locator('form button[type=submit]')); await pg.wait_for_timeout(1800)
        ok2='Deine Analysen' in await body()
        if 'storage_blocked' not in name:
            await pg.reload(); await pg.wait_for_timeout(4300)
            ok4='Deine Analysen' in await body()
    print(f"{n:4} {name:20} register={ok1} wrongpw_rejected={ok3} login={ok2} persists_reload={ok4} errs={errs[:1]}")
    await b.close()
    return ok1 and ok2 and ok3 and ok4
async def main():
    async with async_playwright() as p:
        res=[]
        for name,c in SC.items():
            if only and name not in only: continue
            try: res.append(await run(p,name,c))
            except Exception as e: print(n,name,'EXC',str(e)[:140]); res.append(False)
        print('ALL OK' if all(res) else 'FAILURES')
asyncio.run(main())
