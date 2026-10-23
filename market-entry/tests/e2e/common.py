"""Shared helpers for the browser tests (Playwright, Chromium).

Two builds are tested:
  DEMO_URL  build made with VITE_DEMO=1  (offline demo: any login works, no network)
  REAL_URL  build made without VITE_DEMO (real Supabase login, tested against a simulated Supabase)
Both are plain URLs (http://localhost:4173 from `npm run preview`, or a file:// path to a single-file build).
"""
import os, re, sys

DEMO_URL = os.environ.get("DEMO_URL", "http://localhost:4173")
REAL_URL = os.environ.get("REAL_URL", "http://localhost:4174")
RESULTS = []


def check(name, cond, detail=""):
    RESULTS.append((name, bool(cond)))
    print(("PASS " if cond else "FAIL ") + name + (("  " + str(detail)) if (detail and not cond) else ""))
    return bool(cond)


def finish():
    bad = [n for n, ok in RESULTS if not ok]
    print(f"\n{len(RESULTS) - len(bad)}/{len(RESULTS)} checks passed")
    sys.exit(1 if bad else 0)


async def demo_login(pg, name="tester", pw="x"):
    if await pg.get_by_test_id("hub-login").count() == 0:
        return  # demo build: no login at all
    await pg.get_by_test_id("hub-login").click()
    await pg.locator("#ha-name").fill(name)
    await pg.locator("#ha-pw").fill(pw)
    await pg.locator("[data-testid=hub-auth] button[type=submit]").click()
    await pg.wait_for_timeout(600)


async def open_tool(pg, tool):
    await pg.locator(f"[data-testid=hub-{tool}]").click()
    await pg.wait_for_timeout(4300)  # intro animation


async def analyse_with_testdata(pg):
    await pg.get_by_role("button", name="Neue Analyse").click()
    await pg.wait_for_timeout(500)
    await pg.get_by_test_id("try-testdata").click()
    await pg.get_by_role("button", name="Score berechnen").click()
    await pg.wait_for_timeout(2500)


GERMAN = re.compile(r"\b(und|der|die|das|für|mit|von|ist|nicht|noch|wird|seit|oder|über|dem|den|eine|Markt|Steuer|Wettbewerb|Unternehmen|erforderlich|Konzern\w*|Wachstum|Mrd\.)\b")
