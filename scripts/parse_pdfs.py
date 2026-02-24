#!/usr/bin/env python3
"""
Parse schedule PDFs into JSON for CronoPed.
Uses pdfplumber table extraction with x-position-based column-to-day mapping.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

import json
import re
import os
import pdfplumber

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF_BASE = os.path.join(BASE_DIR, "CRONOGRAMAS 2026.1 - MOD1")

MATERIA_PATHS = {
    "cm": {
        "dir": os.path.join(PDF_BASE, "OneDrive_2026-02-24 (1)", "Clínica Médica"),
        "pattern": "Clínica Médica GRUPO {g}.pdf",
        "groups": list(range(1, 11)),
    },
    "go": {
        "dir": os.path.join(PDF_BASE, "OneDrive_2026-02-24 (2)", "Ginecologia e obstetrícia"),
        "pattern": "Ginecologia e Obstetrícia GRUPO {g}.pdf",
        "groups": list(range(1, 11)),
    },
    "ped": {
        "dir": os.path.join(PDF_BASE, "Pediatria"),
        "pattern": "Pediatria GRUPO {g}.pdf",
        "groups": [1, 2, 3, 4, 5, 7, 8, 9, 10],
    },
}

WEEK_DATES = {
    1: "23/2 – 28/2", 2: "02/3 – 07/3", 3: "09/3 – 14/3",
    4: "16/3 – 21/3", 5: "23/3 – 28/3", 6: "30/3 – 04/4",
    7: "06/4 – 11/4", 8: "13/4 – 18/4", 9: "20/4 – 25/4",
    10: "27/4 – 02/5",
}

# Matches HH:MM – HH:MM (including "às" Portuguese form)
TIME_RE = re.compile(r'(\d{1,2}):(\d{2})\s*(?:[–\-]|às|a)\s*(\d{1,2}):(\d{2})')
# Matches lone timestamp like "08:00" (no end time)
SINGLE_TIME_RE = re.compile(r'^\d{1,2}:\d{2}$')
# Matches "Manhã – 08:00" or "Tarde - 14:00" (turno markers in cells)
TURNO_LINE_RE = re.compile(r'^(Manh[aã]|Tarde)\s*[-–]\s*\d{1,2}:\d{2}', re.IGNORECASE)
# Matches professor/preceptor names
PROF_RE = re.compile(r'^(Prof[aª]?\.?\s|Dr[aª]?\.?\s|Precep\.?\s)', re.IGNORECASE)

# Location line detection (startswith-based to avoid false positives)
LOC_START_KWDS = ("Pavilhão", "pavilhão", "Campus", "campus",
                  "Sala ", "sala ", "SALA ", "Local ", "local ",
                  "Sala de ")

def is_loc_line(lc):
    """True if this line is primarily a location reference."""
    if any(lc.startswith(kw) for kw in LOC_START_KWDS):
        return True
    if lc == "HUV":
        return True
    if re.match(r'^\d{4}', lc):   # room numbers like "8301", "7203"
        return True
    return False


# Day name patterns → normalized abbreviation
DAY_MAP = {}
for n, abr in [(2, '2ª'), (3, '3ª'), (4, '4ª'), (5, '5ª'), (6, '6ª')]:
    DAY_MAP[abr] = abr
    DAY_MAP[f'{n}ª feira'] = abr
    DAY_MAP[f'{n}a feira'] = abr

FULL_DAY_NAMES = {
    'segunda-feira': '2ª', 'segunda': '2ª',
    'terça-feira': '3ª', 'terça': '3ª', 'terca-feira': '3ª', 'terca': '3ª',
    'quarta-feira': '4ª', 'quarta': '4ª',
    'quinta-feira': '5ª', 'quinta': '5ª',
    'sexta-feira': '6ª', 'sexta': '6ª',
    'sábado': 'Sáb', 'sabado': 'Sáb',
}
DAY_MAP.update(FULL_DAY_NAMES)


def is_garbled_digit(text):
    """Detect digit-alpha interleaving: time chars mixed with title chars by x-position."""
    if len(text) < 6:
        return False

    def _count_transitions(s):
        transitions = 0
        prev_type = None
        relevant = 0
        for c in s:
            if c.isdigit():
                cur = 'd'
            elif c.isalpha():
                cur = 'a'
            else:
                continue
            relevant += 1
            if prev_type and cur != prev_type:
                transitions += 1
            prev_type = cur
        return transitions, relevant

    # Fast path: check first 14 chars
    trans_first, rel_first = _count_transitions(text[:14])
    if rel_first >= 5 and trans_first >= 3:
        return True

    # Slow path: check whole string (catches digits buried mid-string)
    digit_count = sum(1 for c in text if c.isdigit())
    if digit_count < 4:
        return False
    trans_all, rel_all = _count_transitions(text)
    return rel_all >= 8 and trans_all / rel_all >= 0.25


def is_garbled_case(text):
    """Detect case-alternation garbling: uppercase/lowercase chars from two layers mixed."""
    alpha = [c for c in text if c.isalpha()]
    if len(alpha) < 8:
        return False
    changes = sum(1 for i in range(1, len(alpha)) if alpha[i].isupper() != alpha[i-1].isupper())
    return changes / len(alpha) > 0.30


def degarble_line(text):
    """
    Remove interleaved time chars from a digit-garbled line.
    Strips digits, colons, dashes (PDF time overlay chars), returns clean title.
    """
    cleaned = re.sub(r'[\d:–\-]', '', text)
    cleaned = re.sub(r'  +', ' ', cleaned).strip()
    if len(cleaned) >= 3 and sum(c.isalpha() for c in cleaned) >= 3:
        return cleaned
    return None


def clean_cell_text(text):
    """Detect and fix garbled lines in cell text (PDF text-layer overlap artifacts)."""
    lines = text.split('\n')
    clean = []
    for line in lines:
        if is_garbled_digit(line):
            fixed = degarble_line(line)
            if fixed:
                clean.append(fixed)
            # else: completely unrecoverable → drop the line
        else:
            clean.append(line)
    return '\n'.join(clean)


def normalize_time(t):
    m = TIME_RE.search(t)
    if m:
        return f"{int(m.group(1)):02d}:{m.group(2)}–{int(m.group(3)):02d}:{m.group(4)}"
    return ""


def parse_cell_text(text):
    if not text or not text.strip():
        return None
    text = text.strip()

    # Pre-check: if entire text is case-garbled (no digits, but case alternation),
    # apply is_garbled_case. We only return None for truly unrecoverable garbling.
    # The keyword shortcuts below will handle specific garbled patterns.
    upper = text.upper()
    if len(upper) < 3:
        return None

    if "FERIADO" in upper:
        return {"title": "Feriado", "sub": "", "time": "", "type": "feriado", "loc": ""}

    if "HORÁRIO VERDE" in upper or "HORARIO VERDE" in upper:
        return {"title": "Horário Verde", "sub": "", "time": "", "type": "verde", "loc": ""}
    # Garbled "Horário verde" after digit-stripping: "Horár io verde", "Hor àr io verde"
    # Pattern: HOR + any 0-5 chars + IO + space + VERDE
    if re.search(r'HOR.{0,5}IO\s+VERDE', upper):
        return {"title": "Horário Verde", "sub": "", "time": "", "type": "verde", "loc": ""}

    if "SIMULADO NACIONAL" in upper or "MEDCOF" in upper:
        return {"title": "Simulado Nacional MEDCOF", "sub": "Campus Universitário",
                "time": normalize_time(text) or "13:00–18:00",
                "type": "destaque", "loc": "Campus Universitário"}

    # "SIMULADO GERAL" or garbled versions like "SIMUML ADDOUL GOE RAL"
    if ("SIMULADO GERAL" in upper or
            (re.search(r'SIM\w*\s+\w*\s*GERAL', upper)) or
            (re.search(r'SIM\w*\s+\w+\s+GO', upper) and "RAL" in upper)):
        return {"title": "Simulado Geral do Módulo", "sub": "Campus Universitário",
                "time": normalize_time(text) or "13:00–18:00",
                "type": "destaque", "loc": "Campus Universitário"}

    if "PROVA" in upper and ("MÓDULO" in upper or "MODULO" in upper):
        return {"title": "Prova do Módulo", "sub": "Campus Universitário",
                "time": normalize_time(text) or "",
                "type": "prova", "loc": "Campus Universitário"}

    # "Consolidação e Performance" — also catches garbled/degarbled variants
    if ("CONSOLIDAÇÃO" in upper or "CONSOLIDACAO" in upper or
        # Degarbled "Performance - EM CASA" may have spaces: "PERFORMA NCE - EM CASA"
        ("PERFORMA" in upper and "EM CASA" in upper) or
        ("PERFORMANCE" in upper and "EM CASA" in upper) or
        (upper.startswith("ATIVIDADE") and ("CONSOLID" in upper or "PERFORMANCE" in upper)) or
        # Case-garbled: "APetirvfiodramdaen dcee c -o EnMso CliAdSaA o e"
        "ENMSO CLIADSAA" in upper or "APETIRVFIO" in upper or
        # Degarbled fragments: "ATIVIDADE DE CONSOLID" spread with spaces
        (re.search(r'ATIVID\w*\s+DE\s+CONSOL', upper)) or
        (re.search(r'CONSOL\w+\s+\w+\s+PERFORMA', upper))):
        return {"title": "Consolidação e Performance", "sub": "Em Casa",
                "time": normalize_time(text) or "",
                "type": "casa", "loc": ""}

    if "PLANTÃO" in upper or "PLANTAO" in upper:
        sub = ""
        a_m = re.search(r'A\)\s*(\d+[:\.]?\d*)\s*[–\-]\s*(\d+[:\.]?\d*)', text)
        b_m = re.search(r'B\)\s*(\d+[:\.]?\d*)\s*[–\-]\s*(\d+[:\.]?\d*)', text)
        if a_m and b_m:
            sub = f"A) {a_m.group(1)}–{a_m.group(2)} · B) {b_m.group(1)}–{b_m.group(2)}"
        return {"title": "Plantão HUV" if "HUV" in upper else "Plantão",
                "sub": sub, "time": normalize_time(text) or "08:00–18:00",
                "type": "plantao", "loc": ""}

    # Garbled "Plantão HUV": "PlHanUtVão" → "H" and "U" and "V" scattered
    if (re.search(r'PL.{0,3}N.{0,3}T', upper) and
            (re.search(r'H.{0,3}U.{0,3}V', upper) or "HUV" in upper)):
        return {"title": "Plantão HUV", "sub": "", "time": normalize_time(text) or "08:00–18:00",
                "type": "plantao", "loc": ""}

    # PRÁTICA DE DIAGNÓSTICO POR IMAGEM (also garbled variants with NÓSTI+IMAGEM fragments)
    if ("PRÁTICA DE DIAGNÓSTICO" in upper or "PRATICA DE DIAGNOSTICO" in upper or
            ("IMAGEM" in upper and re.search(r'N.{0,2}STI', upper)) or
            ("IMAGEM" in upper and "DIAGNÓ" in upper)):
        return {"title": "Prática de Diagnóstico por Imagem", "sub": "",
                "time": normalize_time(text) or "",
                "type": "normal", "loc": ""}

    # Ambulatório HUV: clean entry OR garbled (AMBU chars + HUV scattered)
    # Catches: clean "Ambulatório HUV", garbled "AmDbrau.l ...", "Dr. Name\nAmbulatório HUV"
    if (re.search(r'A.{0,3}M.{0,3}B.{0,3}U', upper) and
            (re.search(r'H.{0,3}U.{0,3}V', upper) or "HUV" in upper)):
        sub_dr = ""
        for _l in text.split('\n'):
            if PROF_RE.match(_l.strip()):
                sub_dr = _l.strip()
                break
        return {"title": "Ambulatório HUV", "sub": sub_dr,
                "time": normalize_time(text) or "",
                "type": "ambulatorio", "loc": "HUV"}

    # Garbled AMBULAT. DE NEFRO: "APrMoBfaU...NlaE FRO" → AMBULAT chars + FRO end
    if ("FRO" in upper and re.search(r'A.{0,3}M.{0,3}B.{0,3}U', upper)):
        return {"title": "AMBULAT. DE NEFRO", "sub": "",
                "time": normalize_time(text) or "",
                "type": "ambulatorio", "loc": ""}

    # Garbled AMBULAT. DE GERIATRIA: "ERIATRIA" appears scattered
    if "ERIATRIA" in upper:
        return {"title": "AMBULAT. DE GERIATRIA", "sub": "",
                "time": normalize_time(text) or "",
                "type": "ambulatorio", "loc": ""}

    # Garbled SAÚDE MENTAL: "SaDr.d Ge aMberinetla l" → SA+D nearby AND M+N+T+L scattered
    if (re.search(r'SA.{0,5}D', upper) and re.search(r'M.{0,5}N.{0,3}T.{0,2}L', upper)):
        return {"title": "Saúde Mental", "sub": "",
                "time": normalize_time(text) or "",
                "type": "saude_mental", "loc": ""}

    # Garbled C. DE SIMULAÇÕES: "C. dDe rSai.m Tuhalais ões" → C. + D+E+S+I+M scattered
    # Check is_garbled_case on the first C. line only (multi-line cells may dilute transition rate)
    _c_line = None
    for _l in text.split('\n'):
        _ls = _l.strip()
        if _ls.upper().startswith("C.") and len(_ls) > 4:
            _c_line = _ls
            break
    if (_c_line is not None and
            re.search(r'D.{0,3}E.{0,5}S.{0,3}I.{0,3}M', _c_line.upper()) and
            is_garbled_case(_c_line)):
        return {"title": "C. de Simulações", "sub": "",
                "time": normalize_time(text) or "",
                "type": "simulacao", "loc": ""}

    # ── General parsing: iterative title building ──────────────────────────
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    title_parts = []
    sub = ""
    time_str = ""
    loc = ""
    collecting_title = True

    for line in lines:
        # Single timestamp ("08:00") or turno marker ("Manhã – 08:00") → skip
        if SINGLE_TIME_RE.match(line):
            collecting_title = False
            continue
        if TURNO_LINE_RE.match(line):
            collecting_title = False
            continue
        # Time range → extract and stop title collection
        if TIME_RE.search(line):
            if not time_str:
                time_str = normalize_time(line)
            collecting_title = False
            continue

        lc = line.strip()
        if not lc:
            continue

        if collecting_title:
            if PROF_RE.match(lc):
                # Professor/preceptor: ends title if we already have one
                if title_parts:
                    collecting_title = False
                    if not sub:
                        sub = lc
                else:
                    # No title yet (PDF omitted activity name); use professor as fallback
                    title_parts.append(lc)
                    collecting_title = False
            elif not lc[0].islower() and is_loc_line(lc):
                # Location line (starts with uppercase): ends title
                if title_parts:
                    collecting_title = False
                    if not loc:
                        loc = lc
                # If no title yet, unusual → skip
            else:
                # Regular text (including lowercase continuations like "mulher", "Família")
                title_parts.append(lc)
        else:
            # After title collection: gather sub and loc
            if PROF_RE.match(lc) and not sub:
                sub = lc
            elif is_loc_line(lc) and not loc:
                loc = lc

    title = " ".join(title_parts)
    title = TIME_RE.sub('', title).strip().rstrip(' –-')
    title = re.sub(r'\s+', ' ', title).strip()

    if not title:
        return None

    tl = title.lower()
    # Use "enfer" / "ambu" / "aloj" to also catch degarbled titles with extra spaces
    # e.g. "Enfer ma ri a" (from "0E8n:0fe0r m0a 1r2i:0a0") still has "enfer"
    if "enfermaria" in tl or (tl.startswith("enfer") and len(tl) < 20):
        act_type = "enfermaria"
    elif "ambulat" in tl or "ambu" in tl or "ambulatório" in tl or "ambulatorio" in tl:
        act_type = "ambulatorio"
    elif "aloj" in tl:
        act_type = "alojamento"
    elif "c. de simulaç" in tl or "centro de simula" in tl:
        act_type = "simulacao"
    elif "saúde mental" in tl or "saude mental" in tl:
        act_type = "saude_mental"
    else:
        act_type = "normal"

    return {"title": title, "sub": sub, "time": time_str, "type": act_type, "loc": loc}


def get_column_x_ranges(table):
    """Get x-ranges for each grid column in a table, merging thin columns."""
    xs = sorted(set(c[0] for c in table.cells) | set(c[2] for c in table.cells))

    # Merge close x boundaries
    merged = [xs[0]]
    for x in xs[1:]:
        if x - merged[-1] > 12:
            merged.append(x)
        else:
            # Keep the rightmost boundary
            merged[-1] = x

    # Return ranges
    ranges = []
    for i in range(len(merged) - 1):
        ranges.append((merged[i], merged[i + 1]))

    return ranges


def find_day_mapping(page, x_ranges, all_cells):
    """
    Determine which x_range corresponds to which day.
    Uses the header row text to identify day columns.
    Returns: (col_day_map, week_col, turno_col)
    """
    ys = sorted(set(c[1] for c in all_cells) | set(c[3] for c in all_cells))
    if len(ys) < 2:
        return None, None, None

    y0, y1 = ys[0], ys[1]

    col_day_map = {}
    week_col = None
    turno_col = None

    for ci, (x0, x1) in enumerate(x_ranges):
        if x1 - x0 < 10:
            continue
        try:
            cropped = page.crop((x0, y0, x1, y1))
            text = (cropped.extract_text() or "").strip()
        except:
            text = ""

        text_lower = text.lower()
        if text in DAY_MAP:
            col_day_map[ci] = DAY_MAP[text]
        elif text_lower in DAY_MAP:
            col_day_map[ci] = DAY_MAP[text_lower]
        elif text_lower in ['turno']:
            turno_col = ci
        elif text_lower in ['semana']:
            week_col = ci

    if len(col_day_map) >= 5:
        # Find the week label column if not found via header
        if week_col is None:
            for ci, (x0, x1) in enumerate(x_ranges):
                if ci not in col_day_map and ci != turno_col and x1 - x0 > 30:
                    week_col = ci
                    break
        return col_day_map, week_col, turno_col

    return None, None, None


def map_columns_by_x_position(x_ranges, ref_day_cols):
    """
    Map columns to days using reference x-ranges from page 1.
    ref_day_cols: dict day_name -> x_center from the reference page.
    """
    col_day_map = {}
    for ci, (x0, x1) in enumerate(x_ranges):
        center = (x0 + x1) / 2
        best_day = None
        best_dist = float('inf')
        for day, ref_center in ref_day_cols.items():
            dist = abs(center - ref_center)
            if dist < best_dist and dist < 60:
                best_dist = dist
                best_day = day
        if best_day:
            col_day_map[ci] = best_day

    return col_day_map


def extract_row_cells(page, x_ranges, y0, y1):
    """Extract text for each column in a row using exact cell cropping."""
    cells = {}
    for ci, (x0, x1) in enumerate(x_ranges):
        if x1 - x0 < 10:
            continue
        try:
            cropped = page.crop((x0 + 1, y0, x1 - 1, y1))
            text = (cropped.extract_text() or "").strip()
        except:
            text = ""
        if text:
            cells[ci] = text
    return cells


def detect_week_number(wk_text, current_week):
    """Try to detect a week number from the week label text."""
    if not wk_text:
        return None
    # Try ordinal pattern first (e.g., "10ª", "1ª SEMANA")
    wm = re.search(r'(\d{1,2})\s*[ªa]', wk_text)
    if not wm:
        wm = re.search(r'(\d+)', wk_text)
    if wm:
        wn = int(wm.group(1))
        is_ordinal = bool(re.search(r'(\d{1,2})\s*[ªa](\s|$)', wk_text))
        has_keywords = ('SEMANA' in wk_text.upper() or '/' in wk_text or 'a ' in wk_text)
        if 1 <= wn <= 11 and (is_ordinal or has_keywords):
            return wn
    return None


def extract_schedule(pdf_path, debug=False):
    """Extract schedule from PDF."""
    pdf = pdfplumber.open(pdf_path)

    # Reference day column info: day_name -> x_center
    ref_day_centers = {}
    ref_week_col = None
    ref_turno_col = None  # For PED format with explicit turno column

    # All extracted data: (week, day, turno) -> text
    cell_data = {}
    current_week = None
    ped_active_turno = None  # Persists across tables for PED-style

    for page_idx, page in enumerate(pdf.pages):
        tables_found = page.find_tables()
        if not tables_found:
            continue

        # Collect significant tables (>= 15 cells), sorted by top y position
        sig_tables = [t for t in tables_found if len(t.cells) >= 15]
        if not sig_tables:
            sig_tables = [max(tables_found, key=lambda t: len(t.cells))]
        sig_tables.sort(key=lambda t: min(c[1] for c in t.cells))

        for table_idx, main_table in enumerate(sig_tables):
            x_ranges = get_column_x_ranges(main_table)

            if debug:
                print(f"  Page {page_idx+1} table {table_idx}: {len(x_ranges)} cols, x_ranges={[(round(a), round(b)) for a, b in x_ranges]}", file=sys.stderr)

            # Get y boundaries
            ys = sorted(set(c[1] for c in main_table.cells) | set(c[3] for c in main_table.cells))
            merged_ys = [ys[0]]
            for y in ys[1:]:
                if y - merged_ys[-1] > 5:
                    merged_ys.append(y)

            # Determine day mapping
            col_day_map, week_col, turno_col = find_day_mapping(page, x_ranges, main_table.cells)

            if col_day_map:
                # Store reference centers
                for ci, day in col_day_map.items():
                    x0, x1 = x_ranges[ci]
                    ref_day_centers[day] = (x0 + x1) / 2
                if week_col is not None:
                    ref_week_col = week_col
                if turno_col is not None:
                    ref_turno_col = turno_col
            else:
                # Use reference mapping
                col_day_map = map_columns_by_x_position(x_ranges, ref_day_centers)
                week_col = ref_week_col
                turno_col = ref_turno_col
                # Find week column if not available
                if week_col is None:
                    for ci, (x0, x1) in enumerate(x_ranges):
                        if ci not in col_day_map and ci != turno_col and x1 - x0 > 30 and x0 < 120:
                            week_col = ci
                            break

            if debug:
                print(f"    day_map={col_day_map}, week_col={week_col}, turno_col={turno_col}", file=sys.stderr)

            if not col_day_map:
                continue

            has_turno_col = turno_col is not None

            if has_turno_col:
                # ═══ PED-style: explicit turno column, thin rows ═══════════════
                # Block = contiguous region with same (week, turno).

                # First: scan all row boundaries to build (y, turno, week) markers
                row_info = []  # [(y0, y1, turno_or_None, week_or_None)]
                for yi in range(len(merged_ys) - 1):
                    y0, y1 = merged_ys[yi], merged_ys[yi + 1]
                    if y1 - y0 < 5:
                        continue

                    wk_text = ""
                    turno_text = ""
                    if week_col is not None:
                        try:
                            cropped = page.crop((x_ranges[week_col][0]+1, y0, x_ranges[week_col][1]-1, y1))
                            wk_text = (cropped.extract_text() or "").strip()
                        except:
                            pass
                    if turno_col is not None:
                        try:
                            cropped = page.crop((x_ranges[turno_col][0]+1, y0, x_ranges[turno_col][1]-1, y1))
                            turno_text = (cropped.extract_text() or "").strip()
                        except:
                            pass

                    # PED week: standalone number only (avoid matching dates like "09/3")
                    wn = None
                    if wk_text:
                        wm = re.match(r'^(\d{1,2})\s*$', wk_text.split('\n')[0].strip())
                        if wm:
                            n = int(wm.group(1))
                            if 1 <= n <= 11:
                                wn = n

                    turno = None
                    tl = turno_text.lower()
                    if 'manhã' in tl or 'manha' in tl:
                        turno = 'Manhã'
                    elif 'tarde' in tl:
                        turno = 'Tarde'

                    row_info.append((y0, y1, turno, wn))

                # Build blocks: turno changes = block boundaries.
                raw_blocks = []  # (turno, y_start, y_end, [week_numbers_found])
                block_y0 = None
                block_weeks = []

                # If first rows have no turno, inherit from previous table
                if ped_active_turno and row_info:
                    block_y0 = row_info[0][0]
                    block_weeks = []

                for y0, y1, turno, wn in row_info:
                    if turno is not None and turno != ped_active_turno:
                        # Turno changed — close previous block
                        if ped_active_turno is not None and block_y0 is not None:
                            raw_blocks.append((ped_active_turno, block_y0, y0, block_weeks[:]))
                        ped_active_turno = turno
                        block_y0 = y0
                        block_weeks = []

                    if wn is not None:
                        block_weeks.append(wn)

                # Close last block
                if ped_active_turno is not None and block_y0 is not None and row_info:
                    raw_blocks.append((ped_active_turno, block_y0, row_info[-1][1], block_weeks[:]))

                # Assign week numbers to blocks
                blocks = []  # (week, turno, y_start, y_end)
                prev_block_turno = None
                for turno, by0, by1, weeks_found in raw_blocks:
                    if weeks_found:
                        wn = weeks_found[0]
                        current_week = wn
                    else:
                        # Heuristic: Tarde→Manhã = new week
                        if turno == 'Manhã' and prev_block_turno == 'Tarde':
                            current_week = (current_week or 0) + 1
                        wn = current_week

                    prev_block_turno = turno
                    if wn and wn <= 10:
                        blocks.append((wn, turno, by0, by1))

                if debug:
                    for wn, t, y0, y1 in blocks:
                        print(f"    block: wk={wn} {t} y=[{round(y0)},{round(y1)}]", file=sys.stderr)

                # Second pass: crop day columns for each block
                for wn, turno, block_y0, block_y1 in blocks:
                    if wn > 10:
                        continue
                    for ci, day in col_day_map.items():
                        x0, x1 = x_ranges[ci]
                        try:
                            cropped = page.crop((x0 + 1, block_y0, x1 - 1, block_y1))
                            text = (cropped.extract_text() or "").strip()
                        except:
                            text = ""
                        if text:
                            key = (wn, day, turno)
                            if key not in cell_data:
                                cell_data[key] = text
                            else:
                                cell_data[key] += '\n' + text

            else:
                # ═══ CM/GO-style: no turno column ═══════════════════════════
                # Use actual cell boundaries per column to determine Manhã/Tarde split.
                # Avoids the row-counting heuristic that breaks on thin-row PDFs.

                day_col_indices = sorted(col_day_map.keys())
                if not day_col_indices:
                    continue

                # Pass 1: detect week-number → y_start within this table
                week_y_starts_local = {}  # wn -> first y where it appears
                for yi in range(len(merged_ys) - 1):
                    y0, y1 = merged_ys[yi], merged_ys[yi + 1]
                    if y1 - y0 < 5:
                        continue
                    row_cells = extract_row_cells(page, x_ranges, y0, y1)
                    wk_text = ""
                    if week_col is not None and week_col in row_cells:
                        wk_text = row_cells[week_col]
                    for ci in row_cells:
                        if ci not in col_day_map and ci != week_col and x_ranges[ci][0] < 120:
                            wk_text += " " + row_cells[ci]
                    wk_text = wk_text.strip()
                    wn = detect_week_number(wk_text, current_week)
                    if wn:
                        if wn not in week_y_starts_local:
                            week_y_starts_local[wn] = y0
                        current_week = wn

                # If this page has no new week labels, treat whole table as current week
                if not week_y_starts_local and current_week:
                    week_y_starts_local[current_week] = merged_ys[0]

                if not week_y_starts_local:
                    continue

                # Pre-compute cells for reference day column (middle column for robustness)
                ref_ci = day_col_indices[len(day_col_indices) // 2]
                ref_x0, ref_x1 = x_ranges[ref_ci]
                ref_col_cells_all = sorted(set(
                    (round(c[1]), round(c[3])) for c in main_table.cells
                    if c[0] < ref_x1 and c[2] > ref_x0 and c[3] - c[1] > 5
                ))

                # Pass 2: for each week group, extract Manhã and Tarde
                sorted_local = sorted(week_y_starts_local.keys())
                page_bottom = merged_ys[-1]

                for idx, wn in enumerate(sorted_local):
                    if wn > 10:
                        continue
                    wg_y0 = week_y_starts_local[wn]
                    wg_y1 = week_y_starts_local[sorted_local[idx + 1]] if idx + 1 < len(sorted_local) else page_bottom

                    if debug:
                        print(f"    week {wn}: y=[{round(wg_y0)},{round(wg_y1)}]", file=sys.stderr)

                    # Find cells of reference column within this week group
                    cells_in_group = sorted(
                        (cy0, cy1) for cy0, cy1 in ref_col_cells_all
                        if cy0 >= wg_y0 - 2 and cy1 <= wg_y1 + 2
                    )

                    # If reference column has no cells, try all day columns
                    if not cells_in_group:
                        for ci in day_col_indices:
                            dcx0, dcx1 = x_ranges[ci]
                            dc = sorted(set(
                                (round(c[1]), round(c[3])) for c in main_table.cells
                                if c[0] < dcx1 and c[2] > dcx0 and c[3] - c[1] > 5
                                and c[1] >= wg_y0 - 2 and c[3] <= wg_y1 + 2
                            ))
                            if dc:
                                cells_in_group = dc
                                break

                    if not cells_in_group:
                        continue

                    # First cell = Manhã extent, everything below = Tarde
                    manha_y_end = cells_in_group[0][1]

                    if debug:
                        print(f"      manha=[{round(wg_y0)},{round(manha_y_end)}] tarde=[{round(manha_y_end)},{round(wg_y1)}]", file=sys.stderr)

                    # Extract Manhã
                    for ci, day in col_day_map.items():
                        cx0, cx1 = x_ranges[ci]
                        try:
                            text = (page.crop((cx0 + 1, wg_y0, cx1 - 1, manha_y_end)).extract_text() or "").strip()
                        except:
                            text = ""
                        if text:
                            key = (wn, day, 'Manhã')
                            if key not in cell_data:
                                cell_data[key] = text

                    # Extract Tarde (only if there's meaningful space below Manhã)
                    if manha_y_end < wg_y1 - 5:
                        for ci, day in col_day_map.items():
                            cx0, cx1 = x_ranges[ci]
                            try:
                                text = (page.crop((cx0 + 1, manha_y_end, cx1 - 1, wg_y1)).extract_text() or "").strip()
                            except:
                                text = ""
                            if text:
                                key = (wn, day, 'Tarde')
                                if key not in cell_data:
                                    cell_data[key] = text

    pdf.close()

    # Build week structures
    weeks = {}
    for (wn, day, turno), text in cell_data.items():
        text = clean_cell_text(text)
        parsed = parse_cell_text(text)
        if parsed:
            if wn not in weeks:
                weeks[wn] = []
            weeks[wn].append({"day": day, "turno": turno, **parsed})

    # Sort and format
    result = []
    day_order = {'2ª': 0, '3ª': 1, '4ª': 2, '5ª': 3, '6ª': 4, 'Sáb': 5}
    turno_order = {'Manhã': 0, 'Tarde': 1}

    for wn in sorted(weeks.keys()):
        acts = weeks[wn]
        acts.sort(key=lambda a: (day_order.get(a['day'], 9), turno_order.get(a['turno'], 9)))
        for i, a in enumerate(acts, 1):
            a['id'] = f"{wn}-{i}"
        result.append({
            "num": wn,
            "dates": WEEK_DATES.get(wn, ""),
            "activities": acts,
        })

    return result


def process_materia(materia_id, debug=False):
    config = MATERIA_PATHS[materia_id]
    result = {}
    for g in config['groups']:
        filename = config['pattern'].format(g=g)
        filepath = os.path.join(config['dir'], filename)
        if not os.path.exists(filepath):
            print(f"  [SKIP] {filename}", file=sys.stderr)
            continue
        print(f"  Group {g}", file=sys.stderr)
        weeks = extract_schedule(filepath, debug=debug)
        total = sum(len(w['activities']) for w in weeks)
        print(f"    {len(weeks)} weeks, {total} activities", file=sys.stderr)
        result[g] = weeks
    return result


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('materia', choices=['cm', 'go', 'ped', 'all'])
    parser.add_argument('--group', type=int)
    parser.add_argument('--debug', action='store_true')
    args = parser.parse_args()

    materias = ['cm', 'go', 'ped'] if args.materia == 'all' else [args.materia]
    all_results = {}

    for mid in materias:
        print(f"\n=== {mid.upper()} ===", file=sys.stderr)
        if args.group:
            config = MATERIA_PATHS[mid]
            filepath = os.path.join(config['dir'], config['pattern'].format(g=args.group))
            if os.path.exists(filepath):
                weeks = extract_schedule(filepath, debug=args.debug)
                all_results[mid] = {args.group: weeks}
                total = sum(len(w['activities']) for w in weeks)
                print(f"  G{args.group}: {len(weeks)} wks, {total} acts", file=sys.stderr)
        else:
            all_results[mid] = process_materia(mid, debug=args.debug)

    print(json.dumps(all_results, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
