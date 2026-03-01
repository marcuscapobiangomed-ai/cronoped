"""
Parser completo para CRONO1AO8 — todos os períodos, todos os grupos.

- Mescla arquivos duplicados (raw_A1.txt + raw_A1 (1).txt + raw_A1 (2).txt → A1)
- Aceita grupos A/B/C e qualquer quantidade por período
- Gera um JSON por período + JSON geral + resumo

Uso:
    python parse_crono1ao8.py

Lê:  CRONO1AO8/N PERIODO/raw_*.txt
Gera: CRONO1AO8/dados_periodo_N.json  (um por período)
      CRONO1AO8/dados_todos.json       (todos os períodos juntos)
      CRONO1AO8/resumo.txt
"""
import json
import re
import sys
from pathlib import Path

if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE_DIR = Path(__file__).parent.parent / "CRONO1AO8"

# DD-MM-YY, DISC - GRUPO - [HH:MM às HH:MM -] TEMA - [ PROF ] [, Nome UC]
LINE_RE = re.compile(
    r"^(\d{2})-(\d{2})-(\d{2}),\s*"          # data
    r"([\w\-\.]+)\s*-\s*"                      # disciplina
    r"([A-Za-z]\d+)\s*-\s*"                    # grupo
    r"(?:(\d{1,2}:\d{2})\s*às\s*(\d{1,2}:\d{2})\s*-\s*)?"  # horário (opcional)
    r"(.*?)\s*-\s*"                            # tópico
    r"\[\s*(.*?)\s*\]"                         # professor
    r"(?:\s*,\s*(.+))?$"                       # nome UC (opcional)
)

# Extrai código do grupo do nome de arquivo (ignora sufixos como " (1)")
GRUPO_RE = re.compile(r"raw_([A-Za-z]\d+)", re.IGNORECASE)


def parse_line(line: str) -> dict | None:
    line = line.strip()
    if not line:
        return None
    m = LINE_RE.match(line)
    if not m:
        return None

    dd, mm, yy = m.group(1), m.group(2), m.group(3)
    ano = f"20{yy}"

    return {
        "data":        f"{dd}/{mm}/{ano}",
        "_sort":       f"{ano}-{mm}-{dd}",
        "disciplina":  m.group(4),
        "grupo":       m.group(5).upper(),
        "hora_inicio": m.group(6) or "",
        "hora_fim":    m.group(7) or "",
        "topico":      m.group(8).strip(),
        "professor":   m.group(9).strip(),
        "nome_uc":     (m.group(10) or "").strip(),
    }


def parse_periodo(periodo_dir: Path, periodo_num: int) -> list[dict]:
    """Processa todos os raw_*.txt de um período, mesclando duplicatas."""

    # Agrupa arquivos por código de grupo
    grupo_files: dict[str, list[Path]] = {}
    for f in sorted(periodo_dir.glob("*.txt")):
        m = GRUPO_RE.search(f.stem)
        if m:
            g = m.group(1).upper()
            grupo_files.setdefault(g, []).append(f)

    all_events = []
    grupos_count = {}

    for grupo, files in sorted(grupo_files.items()):
        # Lê e mescla todas as versões do grupo (deduplicando)
        linhas_unicas: set[str] = set()
        for f in files:
            try:
                for line in f.read_text(encoding="utf-8").splitlines():
                    line = line.strip()
                    if line:
                        linhas_unicas.add(line)
            except Exception as e:
                print(f"    Erro ao ler {f.name}: {e}")

        eventos = []
        invalidas = 0
        for line in linhas_unicas:
            ev = parse_line(line)
            if ev and ev["grupo"] == grupo:
                eventos.append(ev)
            elif line:
                invalidas += 1

        # Ordena por data e hora
        eventos.sort(key=lambda e: (e["_sort"], e["hora_inicio"]))

        # Remove campo auxiliar
        for e in eventos:
            del e["_sort"]

        n_files = len(files)
        tag = f" ({n_files} arquivos mesclados)" if n_files > 1 else ""
        print(f"    {grupo}: {len(eventos)} eventos{tag}  [{invalidas} linhas inválidas]")

        grupos_count[grupo] = len(eventos)
        all_events.extend(eventos)

    return all_events


def main():
    if not BASE_DIR.exists():
        print(f"Pasta não encontrada: {BASE_DIR}")
        return

    # Descobre os períodos disponíveis
    periodos = sorted(
        [d for d in BASE_DIR.iterdir() if d.is_dir() and "PERIODO" in d.name.upper()],
        key=lambda d: int(re.search(r"\d+", d.name).group())
    )

    if not periodos:
        print("Nenhuma pasta '*PERIODO' encontrada em CRONO1AO8/")
        return

    todos_eventos = []
    resumo_linhas = []

    for periodo_dir in periodos:
        num_match = re.search(r"\d+", periodo_dir.name)
        num = int(num_match.group()) if num_match else 0
        print(f"\n[{periodo_dir.name}]")

        eventos = parse_periodo(periodo_dir, num)

        # Adiciona campo período
        for e in eventos:
            e["periodo"] = num

        todos_eventos.extend(eventos)

        # Salva JSON do período
        out = BASE_DIR / f"dados_periodo_{num}.json"
        with open(out, "w", encoding="utf-8") as f:
            json.dump(eventos, f, ensure_ascii=False, indent=2)

        grupos = sorted(set(e["grupo"] for e in eventos))
        datas  = sorted(set(e["data"]  for e in eventos))
        periodo_resumo = (
            f"{periodo_dir.name}: {len(eventos)} eventos | "
            f"{len(grupos)} grupos {grupos} | "
            f"{datas[0] if datas else '?'} → {datas[-1] if datas else '?'}"
        )
        print(f"  → {periodo_resumo}")
        print(f"  → Salvo: {out.name}")
        resumo_linhas.append(periodo_resumo)

    # Salva JSON geral
    out_todos = BASE_DIR / "dados_todos.json"
    with open(out_todos, "w", encoding="utf-8") as f:
        json.dump(todos_eventos, f, ensure_ascii=False, indent=2)

    # Resumo final
    resumo_linhas.append("")
    resumo_linhas.append(f"TOTAL GERAL: {len(todos_eventos)} eventos em {len(periodos)} períodos")
    resumo_text = "\n".join(resumo_linhas)
    print("\n" + "="*60)
    print(resumo_text)

    (BASE_DIR / "resumo.txt").write_text(resumo_text, encoding="utf-8")
    print(f"\nSalvo: {out_todos.name}")
    print(f"Resumo: resumo.txt")


if __name__ == "__main__":
    main()
