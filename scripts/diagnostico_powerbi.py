"""
Diagnóstico: mata Chrome, sobe com debug, conecta e extrai o texto da página Power BI.
"""
import asyncio
import subprocess
import sys
import time
from pathlib import Path
from playwright.async_api import async_playwright

if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
DEBUG_PORT  = 9222
DEBUG_DIR   = Path(__file__).parent / "debug_powerbi"
DEBUG_DIR.mkdir(exist_ok=True)

PBI_URL = (
    "https://app.powerbi.com/view?r="
    "eyJrIjoiZTExMDdkNTItOTdlOC00NGJkLTk2YzUtNWM0ZDdhNjI4NjA1Iiwidci"
    "6ImQ5MzI3MmM3LTA3YTctNDlmNi1hMTA3LWFiNTMwYjZiMmQzNCJ9"
)

async def main():
    # 1. Mata Chrome existente
    print("Fechando Chrome existente...")
    subprocess.run(["taskkill", "/F", "/IM", "chrome.exe"], capture_output=True)
    time.sleep(2)

    # 2. Sobe Chrome com debug
    print(f"Iniciando Chrome com --remote-debugging-port={DEBUG_PORT}...")
    subprocess.Popen([
        CHROME_PATH,
        f"--remote-debugging-port={DEBUG_PORT}",
        "--no-first-run",
        "--start-maximized",
        PBI_URL,
    ])
    print("Aguardando Chrome iniciar e Power BI carregar (20s)...")
    time.sleep(20)

    async with async_playwright() as p:
        print("Conectando ao Chrome via CDP...")
        try:
            browser = await p.chromium.connect_over_cdp(f"http://127.0.0.1:{DEBUG_PORT}")
        except Exception as e:
            print(f"ERRO ao conectar: {e}")
            return

        ctx = browser.contexts[0]
        pages = ctx.pages
        print(f"Abas abertas: {len(pages)}")
        for i, pg in enumerate(pages):
            print(f"  [{i}] {pg.url[:120]}")

        # Encontra aba do Power BI
        pbi_page = None
        for pg in pages:
            if "powerbi" in pg.url.lower():
                pbi_page = pg
                break

        if not pbi_page:
            print("\nNenhuma aba Power BI encontrada.")
            print("Abra o relatório no Chrome e tente novamente.")
            return

        print(f"\nAba Power BI: {pbi_page.url[:120]}")
        await pbi_page.bring_to_front()
        await asyncio.sleep(3)

        # Screenshot
        await pbi_page.screenshot(path=str(DEBUG_DIR / "diag_inicial.png"), full_page=False)
        print("Screenshot salvo: debug_powerbi/diag_inicial.png")

        # Texto completo
        text = await pbi_page.evaluate("() => document.body.innerText")
        out = DEBUG_DIR / "diag_texto.txt"
        out.write_text(text, encoding="utf-8")
        print(f"Texto salvo: debug_powerbi/diag_texto.txt ({len(text)} chars)")

        # Preview primeiras linhas
        lines = [l.strip() for l in text.splitlines() if l.strip()]
        print(f"\nPrimeiras 40 linhas de texto:\n" + "-"*60)
        for l in lines[:40]:
            print(l)

        print("\n" + "-"*60)
        print(f"Total de linhas não-vazias: {len(lines)}")

asyncio.run(main())
