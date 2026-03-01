#!/usr/bin/env python3
"""
Parse CC (Clínica Cirúrgica) PDFs into JSON, then generate src/data/cc.js.
Uses the same extract_schedule function from parse_pdfs.py.
Auto-discovers PDF files by scanning the directory for group number patterns.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

import json
import os
import re

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(BASE_DIR, "scripts"))
from parse_pdfs import extract_schedule
from generate_js import generate_materia_js

CC_DIR = os.path.join(
    BASE_DIR, "CRONOGRAMAS 2026.1 - MOD1", "OneDrive_2026-02-24",
)


def find_cc_pdfs():
    """Scan CC directory for PDF files, extract group numbers from filenames."""
    # Walk subdirectories to find the CC folder
    cc_dir = None
    for root, dirs, files in os.walk(CC_DIR):
        for d in dirs:
            if "irur" in d.lower() or "irúr" in d.lower():
                cc_dir = os.path.join(root, d)
                break
        if cc_dir:
            break

    if not cc_dir:
        print(f"  [ERROR] CC directory not found under {CC_DIR}", file=sys.stderr)
        return {}

    # Find deepest directory containing PDFs
    pdf_dir = cc_dir
    for root, dirs, files in os.walk(cc_dir):
        pdfs = [f for f in files if f.lower().endswith('.pdf')]
        if pdfs:
            pdf_dir = root
            break

    # Scan for PDFs and match group numbers
    group_files = {}
    for fname in os.listdir(pdf_dir):
        if not fname.lower().endswith('.pdf'):
            continue
        # Extract group number: G1, G2, ..., G10
        m = re.search(r'G(\d{1,2})', fname)
        if m:
            gnum = int(m.group(1))
            if 1 <= gnum <= 10:
                group_files[gnum] = os.path.join(pdf_dir, fname)

    return group_files


def postprocess_cc(weeks):
    """Fix known CC-specific OCR garbling issues."""
    for w in weeks:
        acts_to_remove = []
        for i, a in enumerate(w['activities']):
            title = a['title']
            upper = title.upper()

            # ── Garbled "Centro de Simulação" variants ──
            # "CPreonfatr.o A dnea SCimláuuldaiçaã Zoo n", "SCaelnat ro de S Cimaumlapçuãso"
            # "Centro de Sim ulação"
            if (('CPRE' in upper and ('IMUL' in upper or 'SCIM' in upper)) or
                ('SCAELN' in upper and 'CIR' not in upper) or
                re.search(r'Centro\s+de\s+Sim\s+ula', title)):
                a['title'] = "Centro de Simulação"
                a['type'] = 'simulacao'
                if not a.get('sub') or len(a['sub']) < 3:
                    a['sub'] = ""
                continue

            # ── Garbled "ECG" + "Prof. Emílo" ──
            # "EPCroGf. Emílo"
            if 'EPCR' in upper or (re.search(r'E.?P.?C.?r.?o.?G', title)):
                a['title'] = "ECG"
                a['sub'] = "Prof. Emílo"
                a['loc'] = a.get('loc') or "Sala 7211 – Campus"
                continue

            # ── Garbled "Ambulatório" + doctor name ──
            # "ADmrab. Cullaetróisr io" (Ambulatório + Dra. Cleris)
            # "ADmr. Fbáublaiotó r io" (Ambulatório + Dr. Fábio)
            # "APrmofbau. lAaltiónreio" (Ambulatório + Profa. Aline)
            # "ADmr. Hbuulmatbóeriroto" (Ambulatório + Dr. Humberto)
            is_garbled_amb = (
                ('ADMR' in upper and ('CULL' in upper or 'FBÁU' in upper or 'HBUUL' in upper or 'BLAIO' in upper)) or
                ('APRMOFB' in upper)
            )
            if is_garbled_amb:
                a['type'] = 'ambulatorio'
                if 'CULL' in upper:
                    a['title'] = "Ambulatório"
                    a['sub'] = "Dra. Cleris"
                elif 'FBÁU' in upper or 'FÁUBI' in upper:
                    a['title'] = "Ambulatório"
                    a['sub'] = "Dr. Fábio"
                elif 'APRMOFB' in upper or 'ALIN' in upper:
                    a['title'] = "Ambulatório"
                    a['sub'] = "Profa. Aline"
                elif 'HBUUL' in upper:
                    a['title'] = "Ambulatório"
                    a['sub'] = "Dr. Humberto"
                else:
                    a['title'] = "Ambulatório"
                continue

            # ── Garbled "Atividade de consolidação e Performance" ──
            # "Ae tPiveirdfaodrme adnec ceo -n EsMol iCdaAçSãAo"
            # "Atividade de" (truncated)
            # "e Perf or manc e EM CASA Ambulatório"
            # "Perfor m ance EM CASA Ambulatório"
            if ('ESMOL' in upper or
                re.search(r'AE\s*T.*PEIR', upper) or
                (upper.strip() == 'ATIVIDADE DE') or
                (re.search(r'PERF.{0,5}M.{0,3}NC', upper) and 'EM CASA' in upper)):
                a['title'] = "Consolidação e Performance"
                a['sub'] = "Em Casa"
                a['type'] = 'casa'
                continue

            # ── Garbled "Simulado Nacional MEDCOF" ──
            # "SIMULMADEDOC NOAFCFI ONAL"
            if ('SIMUL' in upper and 'NOAF' in upper) or \
               ('SIMUL' in upper and 'MEDOC' in upper) or \
               ('SIMUL' in upper and 'ADEDOC' in upper):
                a['title'] = "Simulado Nacional MEDCOF"
                a['type'] = 'destaque'
                a['sub'] = "Campus Universitário"
                a['time'] = a.get('time') or "13:00–18:00"
                continue

            # ── Garbled "Sessão Clínica" + "Prof. Nilson" ──
            # "SPerosfs. ãNoi lCsolínn ica"
            if ('SPEROSF' in upper or
                (re.search(r'S.{0,3}PER.{0,3}[OA]', upper) and 'ILSO' in upper)):
                a['title'] = "Sessão Clínica"
                a['sub'] = "Prof. Nilson"
                a['type'] = 'normal'
                continue

            # ── Garbled "Trauma" + "Prof. Rossano Fiorelli" ──
            # "TPrraouf.m Rao ssano Fiorelli"
            if ('TPRRAO' in upper or
                (re.search(r'T.{0,2}R.{0,2}A.{0,2}U', upper) and 'ROSSANO' in upper)):
                a['title'] = "Trauma"
                a['sub'] = "Prof. Rossano Fiorelli"
                a['type'] = 'normal'
                continue

            # ── Garbled "Saúde Digital" / "Profa. Manuela Marcati" ──
            # "PCraomfap. uMsa nuela Marcati"
            if re.search(r'manuela\s+marcati', title, re.IGNORECASE) or \
               ('PCRA' in upper and 'MARCATI' in upper) or \
               ('MANUELA' in upper):
                a['title'] = "Saúde Digital"
                a['sub'] = "Profa. Manuela Marcati"
                a['loc'] = a.get('loc') or "Campus"
                continue

            # ── Garbled "Centro cirúrgico" + "CAMPUS" ──
            # "SCaelnat ro cir úCrAgiMcoP U S"
            if re.search(r'centro\s+cir', title, re.IGNORECASE) or \
               ('SCAELN' in upper and 'CIR' in upper):
                a['title'] = "Centro Cirúrgico"
                a['type'] = 'normal'
                continue

            # ── Fix "Prof. Emílo" as title → should be "ECG" ──
            if upper.strip() == 'PROF. EMÍLO' or upper.strip() == 'PROF. EMILO':
                a['title'] = "ECG"
                a['sub'] = "Prof. Emílo"
                a['loc'] = a.get('loc') or "Sala 7211 – Campus"
                continue

            # ── Fix "Prof. Rossano Fiorelli" as standalone title ──
            if re.search(r'ROSSANO\s+FIORELLI', upper):
                a['title'] = "Trauma"
                a['sub'] = "Prof. Rossano Fiorelli"
                continue

            # ── Fix "Cirurgião Vascular" as title → should be Ambulatório sub ──
            if 'VASCULAR' in upper:
                a['title'] = "Ambulatório"
                a['sub'] = a.get('sub') or "Dr. Sandro – Cirurgião Vascular"
                a['type'] = 'ambulatorio'
                continue

            # ── Fix garbled "Vigilância Epidemiológica" ──
            if (re.search(r'vigil', title, re.IGNORECASE) or
                re.search(r'epidemiol', title, re.IGNORECASE) or
                'VAIGV' in upper or 'PVAI' in upper or
                (re.search(r'V.{0,3}I.{0,3}G.{0,3}I', upper) and 'HOTEL' in upper)):
                a['title'] = "Vigilância Epidemiológica"
                a['sub'] = a.get('sub') or "Prof. Sebastião"
                continue

            # ── Fix garbled "Horário Verde" → "HORÁ R IO VER DE" ──
            if re.search(r'HOR.{0,4}\s*R\s*IO\s+VER', upper):
                a['title'] = "Horário Verde"
                a['type'] = 'verde'
                a['time'] = ""
                continue

            # ── Fix "SIMUL A DO G ERAL" → Simulado Geral do Módulo ──
            if re.search(r'SIMUL\s*A\s*DO\s+G\s*ERAL', upper):
                a['title'] = "Simulado Geral do Módulo"
                a['type'] = 'destaque'
                a['sub'] = "Campus Universitário"
                a['time'] = a.get('time') or "13:00–18:00"
                continue

            # ── Fix standalone "CAMPUS" / "CAMP U S" ──
            if re.match(r'^CAMP\s*U?\s*S$', upper.strip()):
                acts_to_remove.append(i)
                continue

            # ── Fix "Hands on" title that includes professor ──
            if upper.startswith('HANDS ON'):
                parts = re.split(r'\s+(?=Profa?\.|Dr[aª]?\.)', title, maxsplit=1)
                if len(parts) == 2:
                    a['title'] = "Hands on"
                    a['sub'] = parts[1].strip()
                else:
                    a['title'] = "Hands on"
                continue

            # ── Normalize common titles ──
            title_map = {
                'ENFERMARIA': 'Enfermaria',
                'AMBULATÓRIO': 'Ambulatório',
                'AMBULATORIO': 'Ambulatório',
                'TRAUMA': 'Trauma',
            }
            if a['title'].upper().strip() in title_map:
                a['title'] = title_map[a['title'].upper().strip()]

            # ── Fix ambulatório type ──
            if 'ambulat' in a['title'].lower():
                a['type'] = 'ambulatorio'

            # ── Fix ECG location ──
            if a['title'].strip().upper() == 'ECG':
                a['loc'] = a.get('loc') or "Sala 7211 – Campus"

        # Remove marked activities (in reverse to keep indices valid)
        for idx in reversed(acts_to_remove):
            w['activities'].pop(idx)

        # Re-number activity IDs
        for i, a in enumerate(w['activities'], 1):
            a['id'] = f"{w['num']}-{i}"

    return weeks


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--group', type=int, help='Process single group')
    parser.add_argument('--debug', action='store_true')
    parser.add_argument('--json-only', action='store_true', help='Only output JSON, do not generate JS')
    args = parser.parse_args()

    group_files = find_cc_pdfs()
    if not group_files:
        print("No CC PDFs found!", file=sys.stderr)
        return

    print(f"  Found {len(group_files)} CC PDFs:", file=sys.stderr)
    for g in sorted(group_files.keys()):
        print(f"    G{g}: {os.path.basename(group_files[g])}", file=sys.stderr)

    groups_to_process = [args.group] if args.group else sorted(group_files.keys())
    results = {}

    for g in groups_to_process:
        filepath = group_files.get(g)
        if not filepath:
            print(f"  [SKIP] G{g}: not found", file=sys.stderr)
            continue

        print(f"\n  Parsing G{g}: {os.path.basename(filepath)}", file=sys.stderr)
        weeks = extract_schedule(filepath, debug=args.debug)
        weeks = postprocess_cc(weeks)
        total = sum(len(w['activities']) for w in weeks)
        print(f"    → {len(weeks)} weeks, {total} activities", file=sys.stderr)

        # Print summary per week
        for w in weeks:
            acts_by_day = {}
            for a in w['activities']:
                d = a['day']
                acts_by_day[d] = acts_by_day.get(d, 0) + 1
            day_summary = ", ".join(f"{d}:{n}" for d, n in sorted(acts_by_day.items()))
            print(f"      Wk{w['num']} ({w['dates']}): {len(w['activities'])} acts [{day_summary}]", file=sys.stderr)

        results[g] = weeks

    # Output JSON
    json_str = json.dumps({"cc": results}, ensure_ascii=False, indent=2)

    if args.json_only:
        print(json_str)
        return

    # Save JSON
    json_path = os.path.join(BASE_DIR, "scripts", "cc_data.json")
    with open(json_path, "w", encoding="utf-8") as f:
        f.write(json_str)
    print(f"\n  JSON saved to {json_path}", file=sys.stderr)

    # Generate JS
    js_content = generate_materia_js("cc", results)
    js_path = os.path.join(BASE_DIR, "src", "data", "cc.js")
    with open(js_path, "w", encoding="utf-8") as f:
        f.write(js_content)

    total_acts = sum(sum(len(w['activities']) for w in weeks) for weeks in results.values())
    print(f"\n  CC: {len(results)} groups, {total_acts} total activities → {js_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
