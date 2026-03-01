"""
Parser dos arquivos raw_*.txt extraídos do Power BI.
Converte para JSON estruturado e ordena por data.

Uso:
    python parse_powerbi.py

Lê: scripts/raw_A1.txt, raw_A2.txt, ..., raw_B6.txt
Gera: scripts/dados_2periodo.json
      scripts/dados_2periodo_resumo.txt
"""
import json
import re
import sys
from datetime import date
from pathlib import Path

if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

SCRIPTS_DIR = Path(__file__).parent

GRUPOS = ["A1", "A2", "A3", "A4", "A5", "A6",
          "B1", "B2", "B3", "B4", "B5", "B6"]

# DD-MM-YY, DISC - GRUPO - HH:MM às HH:MM - TEMA - [ PROF ] , Nome Completo
# Também aceita campos vazios: "- - - [ ] ,"
LINE_RE = re.compile(
    r"^(\d{2})-(\d{2})-(\d{2}),\s*"   # data
    r"(\S+)\s*-\s*"                     # disciplina
    r"(\S+)\s*-\s*"                     # grupo
    r"(?:(\d{1,2}:\d{2})\s*às\s*(\d{1,2}:\d{2}))?\s*-\s*"  # horário (opcional)
    r"(.*?)\s*-\s*"                     # tópico (pode ser vazio)
    r"\[\s*(.*?)\s*\]"                  # professor (pode ser vazio)
    r"(?:\s*,\s*(.+))?$"               # nome completo UC (opcional)
)

def parse_line(line: str) -> dict | None:
    line = line.strip()
    if not line:
        return None
    m = LINE_RE.match(line)
    if not m:
        return None

    dd, mm, yy = m.group(1), m.group(2), m.group(3)
    ano = f"20{yy}"
    data_iso = f"{ano}-{mm}-{dd}"   # para ordenação
    data_br  = f"{dd}/{mm}/{ano}"   # para exibição

    hora_inicio = m.group(6) or ""
    hora_fim    = m.group(7) or ""
    topico      = m.group(8).strip()
    professor   = m.group(9).strip()
    nome_uc     = (m.group(10) or "").strip()

    return {
        "data":        data_br,
        "_data_iso":   data_iso,       # removido no JSON final
        "disciplina":  m.group(4),
        "grupo":       m.group(5),
        "hora_inicio": hora_inicio,
        "hora_fim":    hora_fim,
        "topico":      topico,
        "professor":   professor,
        "nome_uc":     nome_uc,
    }

def parse_file(path: Path, grupo: str) -> list[dict]:
    if not path.exists():
        print(f"  Arquivo não encontrado: {path.name}")
        return []

    events = []
    linhas_invalidas = 0
    with open(path, encoding="utf-8") as f:
        for line in f:
            ev = parse_line(line)
            if ev:
                # Confirma que é do grupo correto
                if ev["grupo"] == grupo:
                    events.append(ev)
                # Se vier de outro grupo (duplicata), ignora
            elif line.strip():
                linhas_invalidas += 1

    # Ordena por data e depois hora
    events.sort(key=lambda e: (e["_data_iso"], e["hora_inicio"]))

    # Remove campo auxiliar
    for e in events:
        del e["_data_iso"]

    print(f"  {grupo}: {len(events)} eventos  ({linhas_invalidas} linhas inválidas)")
    return events

def main():
    print("Parseando arquivos raw_*.txt...\n")
    all_events = []

    for grupo in GRUPOS:
        path = SCRIPTS_DIR / f"raw_{grupo}.txt"
        events = parse_file(path, grupo)
        all_events.extend(events)

    if not all_events:
        print("\nNenhum evento encontrado. Verifique se os arquivos raw_*.txt existem em scripts/")
        return

    # Salva JSON completo
    out_json = SCRIPTS_DIR / "dados_2periodo.json"
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(all_events, f, ensure_ascii=False, indent=2)

    # Resumo
    grupos_ok  = sorted(set(e["grupo"] for e in all_events))
    disciplinas = sorted(set(e["disciplina"] for e in all_events))
    datas = sorted(set(e["data"] for e in all_events))
    data_inicio = datas[0] if datas else "?"
    data_fim    = datas[-1] if datas else "?"

    resumo = [
        f"Total de eventos: {len(all_events)}",
        f"Grupos: {grupos_ok}",
        f"Período: {data_inicio} → {data_fim}",
        f"Disciplinas ({len(disciplinas)}): {disciplinas}",
        "",
        "Eventos por grupo:",
    ]
    for g in grupos_ok:
        n = sum(1 for e in all_events if e["grupo"] == g)
        resumo.append(f"  {g}: {n}")

    resumo_text = "\n".join(resumo)
    print("\n" + resumo_text)

    out_resumo = SCRIPTS_DIR / "dados_2periodo_resumo.txt"
    out_resumo.write_text(resumo_text, encoding="utf-8")

    print(f"\nSalvo: {out_json}")
    print(f"Resumo: {out_resumo}")

if __name__ == "__main__":
    main()
