import asyncio, os, sys
from playwright.async_api import async_playwright
n=sys.argv[1]
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1280,'height':800}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        src=os.path.abspath(f'demo_{n}_final.html')
        # wrapper with a sandbox that mimics a restrictive preview: scripts only, NO allow-forms, no same-origin
        open('wrap.html','w').write(f'<!doctype html><body style="margin:0"><iframe id="f" src="file://{src}" sandbox="allow-scripts allow-popups" style="width:100vw;height:100vh;border:0"></iframe></body>')
        await pg.goto('file://'+os.path.abspath('wrap.html')); await pg.wait_for_timeout(4800)
        fr=pg.frame_locator('#f')
        await fr.get_by_role('button',name='DE',exact=True).click(); await pg.wait_for_timeout(500)
        await fr.get_by_role('button',name='Konto erstellen').first.click(); await pg.wait_for_timeout(600)
        await pg.screenshot(path=f'../shots2/sandbox_{n}_login.png')
        i=fr.locator('form input'); await i.nth(0).fill('Nadin'); await i.nth(1).fill('Passwort-123!')
        await fr.get_by_role('checkbox',name='Datenschutz').check()
        await fr.locator('form button[type=submit]').click(); await pg.wait_for_timeout(2500)
        t=await fr.locator('body').inner_text(); print(n,'sandboxed click ->','dashboard' if 'Deine Analysen' in t else 'STUCK', errs[:2])
        # Enter key path: logout, login by Enter
        await fr.get_by_role('button',name='Abmelden').first.click(); await pg.wait_for_timeout(700)
        await fr.get_by_role('button',name='Anmelden').first.click(); await pg.wait_for_timeout(500)
        i=fr.locator('form input'); await i.nth(0).fill('Nadin'); await i.nth(1).fill('Passwort-123!'); await i.nth(1).press('Enter'); await pg.wait_for_timeout(2200)
        t=await fr.locator('body').inner_text(); print(n,'sandboxed Enter ->','dashboard' if 'Deine Analysen' in t else 'STUCK')
        # analysis form (also a form)
        await fr.get_by_role('button',name='Neue Analyse').click(); await pg.wait_for_timeout(800)
        tt=fr.locator('input[type=text],input:not([type])'); num=fr.locator('input[type=number]')
        await tt.nth(0).fill('Test GmbH'); await fr.locator('select').select_option(index=1); await tt.nth(1).fill('Sensoren')
        for k,v in enumerate(['18','1.5','120']): await num.nth(k).fill(v)
        await tt.nth(2).fill('ISO'); await tt.nth(3).fill('OEM'); await tt.nth(4).fill('Direkt'); await tt.nth(5).fill('Messer')
        await fr.get_by_role('button',name='Score berechnen').click(); await pg.wait_for_timeout(2500)
        t=await fr.locator('body').inner_text(); print(n,'sandboxed analysis ->','result' if 'Ländervergleich' in t or 'Marktchance' in t or 'Score' in t and 'Test GmbH' in t else 'STUCK')
        await b.close()
asyncio.run(main())
