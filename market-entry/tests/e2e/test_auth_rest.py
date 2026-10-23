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
async def login(pg,email,pw,name=None,reg=False):
    await pg.get_by_test_id('hub-login').click()
    if reg:
        await pg.get_by_role('button',name='Noch kein Konto? Konto erstellen').click()
        await pg.locator('#ha-name').fill(name or 'Nadin')
    await pg.locator('#ha-email').fill(email); await pg.locator('#ha-pw').fill(pw)
    if reg: await pg.get_by_role('checkbox').check()
    await pg.get_by_test_id('hub-auth').get_by_role('button',name='Konto erstellen' if reg else 'Anmelden',exact=True).last.click() if False else await pg.locator('[data-testid=hub-auth] button[type=submit]').click()
    await pg.wait_for_timeout(700)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        # ---- REAL build, mock supabase
        mk_=Mock(confirm=True); ctx,pg,errs=await mk(b,mk_,REAL_URL)
        ok('no demo banner in real build', await pg.locator('#demo-banner').count()==0)
        await login(pg,'nadin@example.com','LangesPasswort1','Nadin',reg=True)
        t=await pg.get_by_test_id('hub-auth').inner_text(); ok('register shows confirm note', 'Bestätigungs' in t)
        await pg.locator('#ha-email').fill('nadin@example.com'); await pg.locator('#ha-pw').fill('LangesPasswort1'); await pg.locator('[data-testid=hub-auth] button[type=submit]').click(); await pg.wait_for_timeout(600)
        t=await pg.get_by_test_id('hub-auth').inner_text(); ok('unconfirmed message', 'noch nicht bestätigt' in t)
        mk_.users['nadin@example.com']['ok']=True
        await pg.locator('#ha-pw').fill('falsch12345'); await pg.locator('[data-testid=hub-auth] button[type=submit]').click(); await pg.wait_for_timeout(500)
        ok('wrong password message', 'Anmeldung nicht möglich' in await pg.get_by_test_id('hub-auth').inner_text())
        await pg.locator('#ha-pw').fill('LangesPasswort1'); await pg.locator('[data-testid=hub-auth] button[type=submit]').click(); await pg.wait_for_timeout(900)
        ok('logged in (hub bar shows user)', 'Nadin' in await pg.get_by_test_id('hub-user').inner_text())
        ls=await pg.evaluate("()=>({t:localStorage.getItem('jast_token'),r:localStorage.getItem('jast_refresh'),u:localStorage.getItem('jast_username')})")
        ok('storage keys jast_token/refresh/username', bool(ls['t'] and ls['r']) and ls['u']=='nadin@example.com')
        await pg.reload(); await pg.wait_for_timeout(1200); ok('reload stays logged in', await pg.get_by_test_id('hub-user').count()==1)
        # expired access token -> refresh
        await pg.evaluate("localStorage.setItem('jast_token','expired')"); mk_.log.clear(); await pg.reload(); await pg.wait_for_timeout(1500)
        ok('expired token refreshed once, still logged in', await pg.get_by_test_id('hub-user').count()==1 and ('POST','/auth/v1/token') in mk_.log)
        # tool: save analysis, reload, comes back from "database"
        await pg.locator('[data-testid=hub-gcc]').click(); await pg.wait_for_timeout(4300)
        await pg.get_by_role('button',name='Neue Analyse').click(); await pg.wait_for_timeout(500)
        await pg.get_by_test_id('try-testdata').click(); await pg.get_by_role('button',name='Score berechnen').click(); await pg.wait_for_timeout(2500)
        ok('analysis saved to REST', any(r for r in mk_.rows.values() if r.get('gcc')))
        await pg.reload(); await pg.wait_for_timeout(4500)
        ok('analysis reloaded from REST after reload', 'Nordlicht' in await pg.inner_text('body'))
        # logout from hub
        await pg.evaluate("location.hash=''"); await pg.reload(); await pg.wait_for_timeout(1500)
        await pg.get_by_role('button',name='Abmelden').click(); await pg.wait_for_timeout(500)
        ls=await pg.evaluate("()=>[localStorage.getItem('jast_token'),localStorage.getItem('jast_refresh'),localStorage.getItem('jast_username')]")
        ok('logout clears all three keys', ls==[None,None,None])
        # network error
        mk_.offline=True; await login(pg,'nadin@example.com','LangesPasswort1')
        ok('network error message', 'Keine Verbindung' in await pg.get_by_test_id('hub-auth').inner_text())
        ok('no console/page errors (real)', not [e for e in errs if 'Failed to load resource' not in e and 'ERR_FAILED' not in e], ) ; pass
        await ctx.close()
        # ---- localStorage blocked
        mk2=Mock(confirm=False); ctx,pg,errs=await mk(b,mk2,REAL_URL,block_ls=True)
        await login(pg,'a@b.de','LangesPasswort1','A',reg=True); await pg.wait_for_timeout(600)
        await pg.locator('#ha-email').fill('a@b.de'); await pg.locator('#ha-pw').fill('LangesPasswort1'); await pg.locator('[data-testid=hub-auth] button[type=submit]').click() if await pg.locator('#ha-pw').count() else None
        await pg.wait_for_timeout(900)
        ok('works with blocked localStorage (memory fallback)', await pg.get_by_test_id('hub-user').count()==1)
        ok('no page errors with blocked localStorage', not [e for e in errs if not e.startswith('C:')]); await ctx.close()
        # ---- setup panel
        ctx,pg,errs=await mk(b,None,REAL_URL); await pg.goto(REAL_URL+'?setup=1'); await pg.wait_for_timeout(800)
        if os.environ.get('SETUP_ENABLED')=='1': ok('setup panel shows default url (build with VITE_ENABLE_SETUP=1)', URL in await pg.locator('[data-testid=setup-panel] input').first.input_value())
        else: ok('setup panel is off by default', await pg.locator('[data-testid=setup-panel]').count()==0)
        await ctx.close()
        # ---- DEMO build: no network to supabase
        reqs=[]; ctx,pg,errs=await mk(b,None,DEMO_URL)
        pg.on('request',lambda r: reqs.append(r.url) if 'supabase' in r.url else None)
        ok('demo banner visible', 'Demo Modus' in await pg.locator('#demo-banner').inner_text())
        ok('demo: no login button on hub', await pg.get_by_test_id('hub-login').count()==0)
        await pg.get_by_test_id('hub-gcc').click(); await pg.wait_for_timeout(4300); await pg.wait_for_timeout(300)
        ok('demo: tool opens directly on the dashboard, no login', await pg.get_by_role('button',name='Neue Analyse').count()==1)
        ok('demo: zero supabase requests', reqs==[]); await ctx.close()
        # offline demo
        ctx=await b.new_context(); pg=await ctx.new_page(); await pg.goto(DEMO_URL); await pg.wait_for_timeout(1500); await ctx.set_offline(True)
        ok('demo works fully offline', 'Demo Modus' in await pg.locator('#demo-banner').inner_text()); await ctx.close()
        await b.close()
if __name__=='__main__':
    asyncio.run(main()); finish()
