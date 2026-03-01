"""
Captura screenshots do Power BI via Playwright (Chromium próprio).
Estratégia: navegar pela página de Agenda, tirar screenshots de todos os grupos,
e também tentar extrair texto do DOM para cada grupo/mês.

Não precisa de Chrome debug — usa Chromium embutido do Playwright.
O usuário faz login manualmente quando o browser abrir.
"""
import asyncio
import sys
import json
import re
from pathlib import Path
from playwright.async_api import async_playwright, TimeoutError as PWTimeout

if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

DEBUG_DIR = Path(__file__).parent / "debug_powerbi"
DEBUG_DIR.mkdir(exist_ok=True)

PBI_URL = (
    "https://app.powerbi.com/view?r="
    "eyJrIjoiZTExMDdkNTItOTdlOC00NGJkLTk2YzUtNWM0ZDdhNjI4NjA1Iiwidci"
    "6ImQ5MzI3MmM3LTA3YTctNDlmNi1hMTA3LWFiNTMwYjZiMmQzNCJ9"
)

GRUPOS = ["A1", "A2", "A3", "A4", "A5", "A6", "B1", "B2", "B3", "B4", "B5", "B6"]

# Regex para linha do painel direito: DD-MM-YY, DISC - GRUPO - HH:MM às HH:MM - TEMA - [ PROF ], ...
RIGHT_RE = re.compile(
    r"(\d{2}-\d{2}-\d{2}),\s*(\S+)\s*-\s*(\S+)\s*-\s*"
    r"(\d{1,2}:\d{2})\s*às\s*(\d{1,2}:\d{2})\s*-\s*(.+?)\s*-\s*\[\s*(.+?)\s*\]"
)

def parse_right_panel(text: str) -> list[dict]:
    events = []
    for line in text.splitlines():
        line = line.strip()
        m = RIGHT_RE.search(line)
        if m:
            # Converte DD-MM-YY → DD/MM/20YY
            d, mo, y = m.group(1).split("-")
            events.append({
                "data":        f"{d}/{mo}/20{y}",
                "disciplina":  m.group(2),
                "grupo":       m.group(3),
                "hora_inicio": m.group(4),
                "hora_fim":    m.group(5),
                "topico":      m.group(6).strip(),
                "professor":   m.group(7).strip(),
            })
    return events

async def get_page_text(page) -> str:
    """Tenta extrair texto do DOM e de iframes acessíveis."""
    text = await page.evaluate("() => document.body.innerText")
    # Tenta iframes
    try:
        frames = page.frames
        for frame in frames:
            try:
                t = await frame.evaluate("() => document.body ? document.body.innerText : ''")
                if t:
                    text += "\n" + t
            except Exception:
                pass
    except Exception:
        pass
    return text

async def wait_idle(page, ms=6000):
    try:
        await page.wait_for_load_state("networkidle", timeout=ms)
    except PWTimeout:
        pass

async def main():
    all_events = []

    async with async_playwright() as p:
        # Abre Chromium próprio do Playwright (não o Chrome do usuário)
        browser = await p.chromium.launch(
            headless=False,
            slow_mo=300,
            args=["--disable-blink-features=AutomationControlled"],
        )
        ctx = await browser.new_context(
            viewport={"width": 1600, "height": 950},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/122.0.0.0 Safari/537.36"
            ),
            locale="pt-BR",
        )
        await ctx.add_init_script(
            "Object.defineProperty(navigator,'webdriver',{get:()=>undefined})"
        )
        page = await ctx.new_page()

        print("Abrindo Power BI...")
        await page.goto(PBI_URL, wait_until="domcontentloaded")

        # Sem login necessário — aguarda Power BI carregar (pode demorar)
        print("Aguardando Power BI carregar (30s)...")
        await page.wait_for_timeout(30000)

        await wait_idle(page)

        # Navega para página 3 (Lista Temática)
        print("Procurando pagina 'Lista Tematica'...")
        for _ in range(5):
            text = await get_page_text(page)
            if "lista tem" in text.lower() or "agenda" in text.lower():
                break
            # Tenta avançar
            try:
                await page.locator("button", has_text=">").last.click()
                await page.wait_for_timeout(2000)
            except Exception:
                break

        # Tenta clicar em "Lista Temática"
        for selector in ["Lista Temática", "Lista Tematica", "Agenda"]:
            try:
                loc = page.get_by_text(selector, exact=True).first
                await loc.wait_for(state="visible", timeout=3000)
                await loc.click()
                await page.wait_for_timeout(2000)
                print(f"  Clicou em '{selector}'")
                break
            except Exception:
                pass

        await page.screenshot(path=str(DEBUG_DIR / "pg3_inicial.png"))

        # Para cada grupo
        for grupo in GRUPOS:
            print(f"\nGrupo {grupo}...", end=" ", flush=True)

            # Tenta clicar no botão do grupo
            try:
                btn = page.get_by_role("button", name=grupo).first
                await btn.wait_for(state="visible", timeout=3000)
                await btn.click()
                await page.wait_for_timeout(2000)
            except Exception:
                # Tenta texto exato
                try:
                    await page.get_by_text(grupo, exact=True).first.click()
                    await page.wait_for_timeout(2000)
                except Exception:
                    print(f"botao nao encontrado, pulando")
                    continue

            await wait_idle(page, 5000)

            # Screenshot
            await page.screenshot(
                path=str(DEBUG_DIR / f"grupo_{grupo}.png"),
                full_page=False,
            )

            # Extrai texto
            text = await get_page_text(page)
            (DEBUG_DIR / f"texto_{grupo}.txt").write_text(text, encoding="utf-8")

            # Parse
            events = parse_right_panel(text)
            events = [e for e in events if e["grupo"] == grupo]
            all_events.extend(events)
            print(f"{len(events)} eventos")

        # Salva resultado
        out = Path(__file__).parent / "dados_2periodo.json"
        with open(out, "w", encoding="utf-8") as f:
            json.dump(all_events, f, ensure_ascii=False, indent=2)

        print(f"\n{'='*60}")
        print(f"Total de eventos: {len(all_events)}")
        print(f"Arquivo salvo: {out}")
        grupos_ok = sorted(set(e['grupo'] for e in all_events))
        print(f"Grupos com dados: {grupos_ok}")

        await browser.close()

asyncio.run(main())
