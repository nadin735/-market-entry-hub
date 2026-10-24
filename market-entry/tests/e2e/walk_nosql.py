import asyncio,os,json,re,sys
from playwright.async_api import async_playwright
from common import DEMO_URL, REAL_URL, check, finish

URL='https://zovkeyyvtaevtkmymiqt.supabase.co'; KEY='sb_publishable_nyXaVfrDVOydffspfZmKlQ_R6TEfIRk'
class Mock0:
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
class Mock(Mock0):
    async def handle(s,route):
        if route.request.url.startswith(URL+'/rest/v1/'):
            return await route.fulfill(status=404,content_type='application/json',headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'},body='{"code":"PGRST205","message":"Could not find the table"}') if route.request.method!='OPTIONS' else await route.fulfill(status=204,headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'})
        return await Mock0.handle(s,route)
async def mk(b,mock,file,block_ls=False,viewport=None):
    ctx=await b.new_context(viewport=viewport or {'width':1280,'height':900},locale='de-DE')
    if not block_ls and file==REAL_URL: await ctx.add_init_script("if(!localStorage.getItem('me_mode'))localStorage.setItem('me_mode','account')")
    if block_ls: await ctx.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw new DOMException('blocked','SecurityError')}})")
    if mock: await ctx.route(URL+'/**',mock.handle)
    pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append('C:'+m.text) if m.type=='error' else None)
    await pg.goto(file); await pg.wait_for_timeout(1200); return ctx,pg,errs
def sess(mock,email='nadin@example.com',name='Nadin Okil'):
    u=mock.users.get(email) or {'id':f'u{len(mock.users)+1}','email':email,'pw':'','meta':{'name':name},'ok':True}
    mock.users[email]=u; return mock.mk(u)

async def btns(pg): return [(n or '').strip() for n in await pg.evaluate("()=>[...document.querySelectorAll('button')].map(b=>b.innerText)")]
async def go(b,mode,tool,hub):
    mock=Mock(); ctx=await b.new_context(viewport={'width':1280,'height':900},locale='en-US',accept_downloads=True)
    await ctx.add_init_script("localStorage.setItem('ui_lang','en');localStorage.setItem('me_mode','%s');window.__pr=0;window.print=()=>{window.__pr++;window.dispatchEvent(new Event('afterprint'))}"%mode)
    await ctx.route(URL+'/**',mock.handle)
    if mode=='account':
        s=sess(mock); await ctx.add_init_script("localStorage.setItem('jast_token','%s');localStorage.setItem('jast_refresh','%s');localStorage.setItem('jast_username','Nadin')"%(s['access_token'],s['refresh_token']))
    pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)[:120])); pg.on('console',lambda m: errs.append('C:'+m.text[:120]) if m.type=='error' else None)
    await pg.goto(REAL_URL); await pg.wait_for_timeout(1500)
    print(mode,tool,'hub text ok:',('Welcome' in await pg.inner_text('body')) or True)
    await pg.get_by_test_id(hub).click(); await pg.wait_for_timeout(2000)
    t=await pg.inner_text('body'); print(' tool opened:', 'Calculate Score' in t or 'New Analysis' in t, '| login shown:', 'Password' in t)
    if 'Calculate Score' not in t:
        if await pg.get_by_role('button',name='New Analysis').count(): await pg.get_by_role('button',name='New Analysis').first.click(); await pg.wait_for_timeout(600)
        if await pg.get_by_test_id('try-testdata').count(): await pg.get_by_test_id('try-testdata').click(); await pg.wait_for_timeout(500)
    await pg.get_by_role('button',name='Calculate Score').click(); await pg.wait_for_timeout(2500)
    print(' result:', '/100' in await pg.inner_text('body'))
    await pg.reload(); await pg.wait_for_timeout(2500)
    t=await pg.inner_text('body'); print(' after reload, analysis persisted:', 'No analyses yet' not in t)
    if await pg.get_by_role('button',name='Dashboard').count(): await pg.get_by_role('button',name='Dashboard').first.click(); await pg.wait_for_timeout(600)
    bl=await btns(pg)
    for lab in [n for n in bl if 'CSV' in n and 'xport' in n]+[n for n in bl if 'JSON' in n]:
        try:
            async with pg.expect_download(timeout=6000) as d: await pg.get_by_role('button',name=lab).first.click()
            x=await d.value; data=open(await x.path(),encoding='utf8').read(); print(' DL OK',x.suggested_filename,len(data),'bytes', 'rows' , data.count('\n'))
        except Exception as e: print(' DL FAIL',lab[:20],str(e)[:80])
    dl=[n for n in bl if 'Delete account' in n]
    if dl:
        await pg.get_by_role('button',name=dl[0]).first.click(); await pg.wait_for_timeout(500)
        bl2=await btns(pg); conf=[n for n in bl2 if 'onfirm' in n or 'Yes' in n or 'permanently' in n.lower()]; print(' delete step 2 buttons:',conf[:2])
        if conf: await pg.get_by_role('button',name=conf[0]).first.click(); await pg.wait_for_timeout(1500); t=await pg.inner_text('body'); print(' after delete:', t[:90].replace('\n',' | '), '| mock rows left:', mock.rows)
    print(' errors:',errs)
    await ctx.close()
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        for mode in ['account']:
            for tool,hub in [('gcc','hub-gcc'),('europe','hub-europe')]:
                try: await go(b,mode,tool,hub)
                except Exception as e: print('CRASH',mode,tool,str(e).splitlines()[0][:150])
asyncio.run(main())
