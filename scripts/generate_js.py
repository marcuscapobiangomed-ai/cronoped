#!/usr/bin/env python3
"""
Generate JS data modules from parsed schedule JSON.
Creates src/data/{cm,go,ped}.js with weeksByGroup exports.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

import json
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "src", "data")


def activity_to_js(a):
    """Convert an activity dict to a JS object literal string."""
    parts = [
        f'id:"{a["id"]}"',
        f'day:"{a["day"]}"',
        f'turno:"{a["turno"]}"',
        f'title:{json.dumps(a["title"], ensure_ascii=False)}',
        f'sub:{json.dumps(a.get("sub", ""), ensure_ascii=False)}',
        f'time:"{a.get("time", "")}"',
        f'type:"{a.get("type", "normal")}"',
    ]
    if a.get("loc"):
        parts.append(f'loc:{json.dumps(a["loc"], ensure_ascii=False)}')
    return "{" + ",".join(parts) + "}"


def week_to_js(w, indent=4):
    """Convert a week dict to a JS object literal string."""
    prefix = " " * indent
    acts = ",\n".join(f"{prefix}    {activity_to_js(a)}" for a in w["activities"])
    return f"""{prefix}{{num:{w["num"]},dates:"{w["dates"]}",activities:[
{acts}
{prefix}]}}"""


def generate_materia_js(materia_id, groups_data):
    """Generate a JS module for a matéria with weeksByGroup."""
    lines = [f"// Auto-generated from PDF schedules — do not edit manually"]
    lines.append(f"export const {materia_id.upper()}_BY_GROUP = {{")

    for g in sorted(groups_data.keys(), key=int):
        weeks = groups_data[g]
        lines.append(f"  {g}: [")
        for w in weeks:
            lines.append(week_to_js(w, indent=4) + ",")
        lines.append("  ],")

    lines.append("};")
    return "\n".join(lines) + "\n"


def main():
    json_path = os.path.join(BASE_DIR, "scripts", "all_data.json")
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    os.makedirs(DATA_DIR, exist_ok=True)

    for mid in ["cm", "go", "ped"]:
        if mid not in data:
            print(f"  [SKIP] {mid} — not in JSON", file=sys.stderr)
            continue

        groups = data[mid]
        js_content = generate_materia_js(mid, groups)
        out_path = os.path.join(DATA_DIR, f"{mid}.js")
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(js_content)

        total_acts = sum(
            sum(len(w["activities"]) for w in weeks)
            for weeks in groups.values()
        )
        print(f"  {mid.upper()}: {len(groups)} groups, {total_acts} total activities → {out_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
