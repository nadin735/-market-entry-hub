import asyncio,os,json,re,sys
from playwright.async_api import async_playwright
from common import DEMO_URL, REAL_URL, check, finish

URL='https://zovkeyyvtaevtkmymiqt.supabase.co'; KEY='sb_publishable_nyXaVfrDVOydffspfZmKlQ_R6TEfIRk'
class Mock:
    def __init__(s,confirm=True): s.users={}; s.rows={}; s.log=[]; s.confirm=confirm; s.offline=False; s.n=0; s.tokens={}; s.refresh={}
    def mk(s,u):
        s.n+=1; a=f'at{s.n}'; r=f'rt{s.n}'; s.tokens[a]=u['id']; s.refresh[r]=u['id']
        return {'access_token':a,'refresh_token':r,'expires_in':3600,'token_type':'bearer','user':{'id':u['id'],'email':u['email'],'user_metadata':u['meta']}}
    def uid(s,req):
        h=req.headers.get('authorization','')[7:]; return s.tokens.get(h)
    async def handle(s,route):
        req=route.request; path=req.url[len(URL):]; m=req.method; s.log.append((m,path.split('?')[0]))
        assert req.headers.get('apikey')==KEY, 'apikey header'
        if s.offline: return await route.abort()
        body=json.loads(req.post_data) if req.post_data else {}
        J=lambda code,d: route.fulfill(status=code,content_type='application/json',headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'},body=json.dumps(d))
        if m=='OPTIONS': return await route.fulfill(status=204,headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'})
        if path.startswith('/auth/v1/signup'):
            e=body['email'].lower()
            if len(body['password'])<10: return await J(422,{'error_code':'weak_password','msg':'Password should be at least 10 characters.'})
            if e in s.users: return await J(200,{'id':'x','email':e})
            u={'id':f'u{len(s.users)+1}','email':e,'pw':body['password'],'meta':body.get('data',{}),'ok':not s.confirm}; s.users[e]=u
            return await J(200,s.mk(u) if u['ok'] else {'id':u['id'],'email':e})
        if path.startswith('/auth/v1/token?grant_type=password'):
            u=s.users.get(body['email'].lower())
            if not u or u['pw']!=body['password']: return await J(400,{'error_code':'invalid_credentials','msg':'Invalid login credentials'})
            if not u['ok']: return await J(400,{'error_code':'email_not_confirmed','msg':'Email not confirmed'})
            return await J(200,s.mk(u))
        if path.startswith('/auth/v1/token?grant_type=refresh_token'):
            uid=s.refresh.get(body['refresh_token'])
            if not uid: return await J(400,{'error_code':'refresh_token_not_found','msg':'Invalid Refresh Token'})
            u=[x for x in s.users.values() if x['id']==uid][0]; return await J(200,s.mk(u))
        if path.startswith('/auth/v1/user') and m=='GET':
            uid=s.uid(req)
            if not uid: return await J(401,{'code':401,'error_code':'bad_jwt','msg':'invalid JWT'})
            u=[x for x in s.users.values() if x['id']==uid][0]; return await J(200,{'id':u['id'],'email':u['email'],'user_metadata':u['meta']})
        if path.startswith('/auth/v1/logout'): return await J(204,{})
        if path.startswith('/auth/v1/recover'): return await J(200,{})
        if path.startswith('/rest/v1/user_data'):
            uid=s.uid(req)
            if not uid: return await J(401,{'message':'JWT expired'})
            if m=='GET': r=s.rows.get(uid); return await J(200,[{'analyses':r}] if r is not None else [])
            if m=='POST': assert body['user_id']==uid; s.rows[uid]=body['analyses']; return await J(201,{})
        if path.startswith('/rest/v1/rpc/delete_my_account'):
            uid=s.uid(req); s.rows.pop(uid,None); return await J(200,None)
        return await J(404,{'msg':'nope '+path})
async def mk(b,mock,file,block_ls=False,viewport=None):
    ctx=await b.new_context(viewport=viewport or {'width':1280,'height':900},locale='de-DE')
    if block_ls: await ctx.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw new DOMException('blocked','SecurityError')}})")
    if mock: await ctx.route(URL+'/**',mock.handle)
    pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append('C:'+m.text) if m.type=='error' else None)
    await pg.goto(file); await pg.wait_for_timeout(1200); return ctx,pg,errs
ok=check
from urllib.parse import quote
def sess(mock,email='nadin@example.com',name='Nadin Okil'):
    u=mock.users.get(email) or {'id':f'u{len(mock.users)+1}','email':email,'pw':'','meta':{'full_name':name},'ok':True}
    mock.users[email]=u; return mock.mk(u)
async def back_from_google(pg,mock,email='nadin@example.com',name='Nadin Okil'):
    d=sess(mock,email,name)
    await pg.goto(REAL_URL+'#access_token='+d['access_token']+'&refresh_token='+d['refresh_token']+'&type=signup'); await pg.reload(); await pg.wait_for_timeout(1500)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        # ---- REAL build: Google only
        mk_=Mock(); ctx,pg,errs=await mk(b,mk_,REAL_URL)
        ok('no demo banner in real build', await pg.locator('#demo-banner').count()==0)
        await pg.get_by_test_id('hub-login').click()
        box=pg.get_by_test_id('hub-auth')
        ok('hub login: only a Google button', await box.locator('input[type=email],input[type=password],input[type=text]').count()==0 and await box.get_by_test_id('hub-google').count()==1)
        t=await box.inner_text(); ok('hub login: no Apple/GitHub', 'Apple' not in t and 'GitHub' not in t)
        await box.get_by_test_id('hub-google').click(); await pg.wait_for_timeout(300)
        ok('hub login: consent required before Google', 'Datenschutz' in await box.inner_text() and 'authorize' not in pg.url)
        urls=[]
        await ctx.route('**/auth/v1/authorize**',lambda r: (urls.append(r.request.url), r.abort())[1])
        await box.get_by_role('checkbox').check(); await box.get_by_test_id('hub-google').click(); await pg.wait_for_timeout(600)
        ok('hub login: redirects to Supabase with provider=google', any('provider=google' in u and 'redirect_to=' in u for u in urls), urls)
        await ctx.close()
        # return from Google
        mk_=Mock(); ctx,pg,errs=await mk(b,mk_,REAL_URL)
        await back_from_google(pg,mk_)
        ok('after Google: hub bar shows the user', 'Nadin' in await pg.get_by_test_id('hub-user').inner_text())
        ok('after Google: token cleaned from the URL', 'access_token' not in pg.url)
        ls=await pg.evaluate("()=>({t:localStorage.getItem('jast_token'),r:localStorage.getItem('jast_refresh')})")
        ok('storage keys jast_token/refresh', bool(ls['t'] and ls['r']))
        await pg.reload(); await pg.wait_for_timeout(1200); ok('reload stays logged in', await pg.get_by_test_id('hub-user').count()==1)
        await pg.evaluate("localStorage.setItem('jast_token','expired')"); mk_.log.clear(); await pg.reload(); await pg.wait_for_timeout(1500)
        ok('expired token refreshed once, still logged in', await pg.get_by_test_id('hub-user').count()==1 and ('POST','/auth/v1/token') in mk_.log)
        # start option "Mit Demodaten testen" opens a new analysis with sample data
        await pg.get_by_test_id('opt-testdata').check()
        await pg.locator('[data-testid=hub-gcc]').click(); await pg.wait_for_timeout(4300)
        ok('start option testdata: new analysis opens with sample data', await pg.locator('input[value*="Nordlicht"]').count()>=1)
        await pg.get_by_role('button',name='Score berechnen').click(); await pg.wait_for_timeout(2500)
        ok('analysis saved to REST', any(r for r in mk_.rows.values() if r.get('gcc')))
        await pg.reload(); await pg.wait_for_timeout(4500)
        ok('analysis reloaded from REST after reload', 'Nordlicht' in await pg.inner_text('body'))
        ok('start option consumed once (no new analysis on reload)', await pg.get_by_role('button',name='Neue Analyse').count()==1)
        # start option "Eigene Daten hochladen" opens the upload tab
        await pg.evaluate("location.hash=''"); await pg.reload(); await pg.wait_for_timeout(1500)
        await pg.get_by_test_id('opt-upload').check(); await pg.locator('[data-testid=hub-gcc]').click(); await pg.wait_for_timeout(4300)
        ok('start option upload: upload field visible', await pg.locator('input[type=file]').count()>=1)
        await pg.evaluate("location.hash=''"); await pg.reload(); await pg.wait_for_timeout(1500)
        await pg.get_by_role('button',name='Abmelden').click(); await pg.wait_for_timeout(500)
        ls=await pg.evaluate("()=>[localStorage.getItem('jast_token'),localStorage.getItem('jast_refresh'),localStorage.getItem('jast_username')]")
        ok('logout clears all three keys', ls==[None,None,None])
        ok('no console/page errors (real)', not [e for e in errs if 'Failed to load resource' not in e and 'ERR_FAILED' not in e])
        # option "Ohne Login" switches to the local demo mode
        await pg.get_by_test_id('opt-nologin').check(); await pg.wait_for_timeout(1500)
        ok('option no login: demo mode, login button gone', await pg.get_by_test_id('hub-login').count()==0 and await pg.get_by_test_id('opt-nologin').is_checked())
        await pg.get_by_test_id('opt-nologin').uncheck(); await pg.wait_for_timeout(1500)
        ok('option no login: can be switched off again', await pg.get_by_test_id('hub-login').count()==1)
        await ctx.close()
        # ---- localStorage blocked
        mk2=Mock(); ctx,pg,errs=await mk(b,mk2,REAL_URL,block_ls=True)
        d=sess(mk2); await pg.goto(REAL_URL+'#access_token='+d['access_token']+'&refresh_token='+d['refresh_token']); await pg.reload(); await pg.wait_for_timeout(1200)
        ok('no page errors with blocked localStorage', not [e for e in errs if not e.startswith('C:')]); await ctx.close()
        # ---- setup panel
        ctx,pg,errs=await mk(b,None,REAL_URL); await pg.goto(REAL_URL+'?setup=1'); await pg.wait_for_timeout(800)
        if os.environ.get('SETUP_ENABLED')=='1': ok('setup panel shows default url (build with VITE_ENABLE_SETUP=1)', URL in await pg.locator('[data-testid=setup-panel] input').first.input_value())
        else: ok('setup panel is off by default', await pg.locator('[data-testid=setup-panel]').count()==0)
        await ctx.close()
        # ---- light mode, shared between hub and tool
        ctx,pg,errs=await mk(b,None,DEMO_URL)
        bg0=await pg.evaluate("document.documentElement.style.background")
        await pg.get_by_test_id('theme-toggle').click(); await pg.wait_for_timeout(300)
        bg1=await pg.evaluate("document.documentElement.style.background")
        ok('hub: theme toggle changes the background', bg0!=bg1, (bg0,bg1))
        ok('hub: theme stored as ui_theme=light', await pg.evaluate("localStorage.getItem('ui_theme')")=='light')
        await pg.get_by_test_id('hub-gcc').click(); await pg.wait_for_timeout(4300)
        tbg=await pg.evaluate("document.documentElement.style.background")
        ok('tool opens in light mode too', 'rgb(246' in tbg, tbg)
        await ctx.close()
        # ---- DEMO build: no network to supabase
        reqs=[]; ctx,pg,errs=await mk(b,None,DEMO_URL)
        pg.on('request',lambda r: reqs.append(r.url) if 'supabase' in r.url else None)
        ok('demo banner visible', 'Demo Modus' in await pg.locator('#demo-banner').inner_text())
        ok('demo: no login button on hub', await pg.get_by_test_id('hub-login').count()==0)
        ok('demo: "Ohne Login" is checked and fixed', await pg.get_by_test_id('opt-nologin').is_checked() and await pg.get_by_test_id('opt-nologin').is_disabled())
        await pg.get_by_test_id('opt-testdata').check()
        await pg.get_by_test_id('hub-gcc').click(); await pg.wait_for_timeout(4600)
        ok('demo: tool opens directly, no login, with sample data', await pg.locator('input[value*="Nordlicht"]').count()>=1)
        ok('demo: zero supabase requests', reqs==[]); await ctx.close()
        ctx=await b.new_context(); pg=await ctx.new_page(); await pg.goto(DEMO_URL); await pg.wait_for_timeout(1500); await ctx.set_offline(True)
        ok('demo works fully offline', 'Demo Modus' in await pg.locator('#demo-banner').inner_text()); await ctx.close()
        await b.close()
if __name__=='__main__':
    asyncio.run(main()); finish()
