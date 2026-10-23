"""Runs every browser test. Needs: pip install playwright && playwright install chromium

  VITE_DEMO=1 npm run build && npx vite preview --port 4173   # demo build (offline demo)
  npm run build && npx vite preview --port 4174               # real build (Supabase login)
  python3 tests/e2e/run_all.py
(DEMO_URL and REAL_URL can also point to single file builds, e.g. file:///path/demo.html.)
"""
import subprocess, sys, os
here = os.path.dirname(os.path.abspath(__file__))
failed = []
for t in ("test_flow.py", "test_a11y.py", "test_auth_rest.py", "test_auth_tools.py"):
    print("\n=== " + t)
    if subprocess.call([sys.executable, os.path.join(here, t)], cwd=here) != 0:
        failed.append(t)
print("\nFAILED: " + ", ".join(failed) if failed else "\nALL TEST FILES PASSED")
sys.exit(1 if failed else 0)
