
#!/usr/bin/env python3
"""Rellena createdAt a partir del nombre del archivo."""

import json
import re
from datetime import datetime, timedelta
from pathlib import Path

folder = Path(__file__).resolve().parents[1] / "data" / "products"
paths = sorted(folder.glob("*.json"))

if not paths:
    raise SystemExit("No hay productos; no se modifica nada")

changes = []

for path in paths:
    item = json.loads(path.read_text(encoding="utf-8"))

    if not isinstance(item, dict):
        raise SystemExit(f"JSON inválido: {path}")

    if item.get("createdAt"):
        continue

    match = re.match(
        r"^(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-",
        path.name
    )

    if match:
        stamp = datetime.strptime(
            "-".join(match.groups()),
            "%Y-%m-%d-%H-%M-%S"
        )
    elif re.fullmatch(r"\d{6}\.json", path.name):
        stamp = datetime(2000, 1, 1) + timedelta(
            seconds=int(path.stem)
        )
    else:
        print(f"Omitido: {path.name}")
        continue

    item["createdAt"] = stamp.strftime("%Y-%m-%dT%H:%M:%S")
    changes.append((path, item))

for path, item in changes:
    json.dumps(item, ensure_ascii=False)

for path, item in changes:
    path.write_text(
        json.dumps(item, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8"
    )

print(f"Actualizados: {len(changes)} de {len(paths)} productos")
