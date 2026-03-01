"""
Extrator de dados do Power BI - 2° Período UNIVASSOURAS
Alvo: Página "Lista Temática" em modo Lista

Uso:
    pip install playwright
    playwright install chromium
    python extrair_powerbi.py

Resultado: dados_2periodo.json
"""

import asyncio
import json
import re
import sys
from pathlib import Path
from playwright.async_api import async_playwright, TimeoutError as PWTimeout

# Força UTF-8 no terminal Windows
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

URL = (
    "https://app.powerbi.com/view?r="
    "eyJrIjoiZTExMDdkNTItOTdlOC00NGJkLTk2YzUtNWM0ZDdhNjI4NjA1Iiwidci"
    "6ImQ5MzI3MmM3LTA3YTctNDlmNi1hMTA3LWFiNTMwYjZiMmQzNCJ9"
)

GRUPOS = ["A1", "A2", "A3", "A4", "A5", "A6",
          "B1", "B2", "B3", "B4", "B5", "B6"]

# Semestre 26.1: fevereiro a julho 2026
MESES_ALVO = [
    "fevereiro de 2026",
    "março de 2026",
    "abril de 2026",
    "maio de 2026",
    "junho de 2026",
    "julho de 2026",
]

# ── Parser ─────────────────────────────────────────────────────────────────
# Formato da linha: "PAPM2 - A1 - 09:00 às 09:30 - TÓPICO - [ Professor ]"
LINE_RE = re.compile(
    r"^(\S+)\s*-\s*(\S+)\s*-\s*(\d{1,2}:\d{2})\s*às\s*(\d{1,2}:\d{2})"
    r"\s*-\s*(.+?)\s*-\s*\[\s*(.+?)\s*\]\s*$"
)

# Formato da data: "23 de fevereiro de 2026" ou "23 de fevereiro de 2026 · segunda-feira"
DATE_RE = re.compile(
    r"(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})(?:\s*[·•]\s*(\w+-\w+|\w+))?"
)

MESES_PT = {
    "janeiro": "01", "fevereiro": "02", "março": "03", "abril": "04",
    "maio": "05", "junho": "06", "julho": "07", "agosto": "08",
    "setembro": "09", "outubro": "10", "novembro": "11", "dezembro": "12",
}

def parse_date(text: str):
    m = DATE_RE.search(text)
    if not m:
        return None
    dia, mes_pt, ano = m.group(1), m.group(2).lower(), m.group(3)
    mes = MESES_PT.get(mes_pt)
    if not mes:
        return None
    return f"{dia.zfill(2)}/{mes}/{ano}"

def parse_event_line(line: str, current_date: str | None):
    m = LINE_RE.match(line.strip())
    if not m:
        return None
    return {
        "data":        current_date or "",
        "disciplina":  m.group(1),
        "grupo":       m.group(2),
        "hora_inicio": m.group(3),
        "hora_fim":    m.group(4),
        "topico":      m.group(5).strip(),
        "professor":   m.group(6).strip(),
    }

# ── Helpers de interação ───────────────────────────────────────────────────
async def wait_network_idle(page, timeout=8000):
    try:
        await page.wait_for_load_state("networkidle", timeout=timeout)
    except PWTimeout:
        pass  # tudo bem, Power BI nunca fica 100% idle

async def click_text(page, text: str, timeout=5000):
    """Clica no primeiro elemento que contém exatamente este texto."""
    try:
        loc = page.get_by_text(text, exact=True).first
        await loc.wait_for(state="visible", timeout=timeout)
        await loc.click()
        await page.wait_for_timeout(2000)
        return True
    except Exception as e:
        print(f"  ⚠ Não encontrou '{text}': {e}")
        return False

async def get_all_text(page) -> str:
    return await page.evaluate("() => document.body.innerText")

# ── Lógica de extração ─────────────────────────────────────────────────────
def extract_from_text(raw_text: str) -> list[dict]:
    """Extrai eventos do texto bruto da página Lista."""
    events = []
    current_date = None

    for line in raw_text.splitlines():
        line = line.strip()
        if not line:
            continue

        # Detecta linha de data
        d = parse_date(line)
        if d:
            current_date = d
            continue

        # Detecta linha de evento
        ev = parse_event_line(line, current_date)
        if ev:
            events.append(ev)

    return events

async def navigate_to_month(page, target_month: str):
    """Clica < ou > até chegar no mês alvo."""
    for _ in range(12):  # máx 12 cliques
        text = await get_all_text(page)
        if target_month.lower() in text.lower():
            return True
        # Tenta avançar
        try:
            await page.locator("button", has_text=">").first.click()
            await page.wait_for_timeout(1500)
        except Exception:
            try:
                await page.get_by_role("button", name=">").click()
                await page.wait_for_timeout(1500)
            except Exception:
                break
    return False

async def scroll_to_bottom(page):
    """Rola a página para garantir que todo conteúdo lazy foi carregado."""
    for _ in range(5):
        await page.evaluate("window.scrollBy(0, 800)")
        await page.wait_for_timeout(500)

# ── Main ───────────────────────────────────────────────────────────────────
async def main():
    out_file = Path(__file__).parent / "dados_2periodo.json"
    debug_dir = Path(__file__).parent / "debug_powerbi"
    debug_dir.mkdir(exist_ok=True)

    all_events = []

    async with async_playwright() as p:
        # ── Conecta ao Chrome já aberto com --remote-debugging-port=9222
        # Instrução: abra o Chrome assim antes de rodar este script:
        #   "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
        # Depois abra o Power BI manualmente no Chrome e faça login se necessário.
        print("Conectando ao Chrome com depuração remota (porta 9222)...")
        try:
            browser = await p.chromium.connect_over_cdp("http://localhost:9222")
            ctx = browser.contexts[0] if browser.contexts else await browser.new_context()
            # Usa aba existente com o Power BI, ou abre uma nova
            pages = ctx.pages
            page = None
            for pg in pages:
                if "powerbi" in pg.url.lower():
                    page = pg
                    print(f"  Aba Power BI encontrada: {pg.url[:80]}")
                    break
            if page is None:
                print("  Nenhuma aba Power BI encontrada. Abrindo nova aba...")
                page = await ctx.new_page()
                await page.goto(URL, wait_until="domcontentloaded")
                print("  Aguardando 20s para o Power BI carregar (faça login se solicitado)...")
                await page.wait_for_timeout(20000)
        except Exception as e:
            print(f"  ERRO ao conectar ao Chrome: {e}")
            print("  Certifique-se de que o Chrome está aberto com --remote-debugging-port=9222")
            print("  Comando: \"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe\" --remote-debugging-port=9222")
            return

        # Traz a aba para frente
        await page.bring_to_front()
        await page.wait_for_timeout(3000)
        await wait_network_idle(page)
        await page.screenshot(path=str(debug_dir / "01_inicial.png"))
        print("   Screenshot salvo: debug_powerbi/01_inicial.png")

        # Salvar texto inicial para diagnóstico
        raw = await get_all_text(page)
        (debug_dir / "01_texto_inicial.txt").write_text(raw, encoding="utf-8")
        print("   Texto inicial salvo: debug_powerbi/01_texto_inicial.txt")

        # ── Passo 2: Navegar para página 3 (Lista Temática)
        print("\n2. Navegando para 'Lista Temática'...")
        ok = await click_text(page, "Lista Temática")
        if not ok:
            # Tenta clicar no botão ">" de navegação de páginas
            print("   Tentando navegar com botão de próxima página...")
            for _ in range(3):
                try:
                    await page.locator('[aria-label="Próxima Página"]').click()
                    await page.wait_for_timeout(2000)
                    text = await get_all_text(page)
                    if "lista temática" in text.lower() or "lista" in text.lower():
                        break
                except Exception:
                    pass

        await page.screenshot(path=str(debug_dir / "02_lista_tematica.png"))
        print("   Screenshot: debug_powerbi/02_lista_tematica.png")

        # ── Passo 3: Ativar modo "Lista"
        print("\n3. Ativando modo Lista...")
        await click_text(page, "Lista")
        await page.wait_for_timeout(2000)
        await page.screenshot(path=str(debug_dir / "03_modo_lista.png"))

        # ── Passo 4: Para cada grupo, extrair todos os meses
        print("\n4. Iniciando extração por grupo e mês...")

        for grupo in GRUPOS:
            print(f"\n   Grupo {grupo}:")

            # Clicar no grupo
            ok = await click_text(page, grupo)
            if not ok:
                print(f"   ⚠ Pulando grupo {grupo} — botão não encontrado")
                continue

            grupo_events = []

            for mes in MESES_ALVO:
                print(f"   • {mes}...", end=" ", flush=True)

                found = await navigate_to_month(page, mes)
                if not found:
                    print("não encontrado, pulando")
                    continue

                await scroll_to_bottom(page)
                await page.wait_for_timeout(1000)

                raw_text = await get_all_text(page)
                events = extract_from_text(raw_text)

                # Filtrar só eventos deste grupo
                group_filtered = [e for e in events if e["grupo"] == grupo]
                grupo_events.extend(group_filtered)
                print(f"{len(group_filtered)} eventos")

            all_events.extend(grupo_events)
            print(f"   → Total grupo {grupo}: {len(grupo_events)} eventos")

            # Screenshot do grupo
            await page.screenshot(
                path=str(debug_dir / f"grupo_{grupo}.png")
            )

        # ── Passo 5: Salvar resultado
        print(f"\n5. Salvando {len(all_events)} eventos em {out_file}...")
        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(all_events, f, ensure_ascii=False, indent=2)

        print(f"\n✅ Concluído! Arquivo: {out_file}")
        print(f"   Screenshots de debug: {debug_dir}/")

        await browser.close()

    # Resumo
    grupos_encontrados = set(e["grupo"] for e in all_events)
    disciplinas = set(e["disciplina"] for e in all_events)
    print(f"\nResumo:")
    print(f"  Grupos: {sorted(grupos_encontrados)}")
    print(f"  Disciplinas: {sorted(disciplinas)}")
    print(f"  Total eventos: {len(all_events)}")

if __name__ == "__main__":
    asyncio.run(main())
