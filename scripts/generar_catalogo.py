
#!/usr/bin/env python3
"""Regenera el catálogo, mostrando primero los productos más recientes."""

import json
from pathlib import Path
from datetime import datetime

root = Path(__file__).resolve().parents[1]
folder = root / "data" / "products"

paths = list(folder.glob("*.json"))

if not paths:
    raise SystemExit("ERROR: no hay productos; no se reemplaza el catálogo")


def fecha_producto(path):
    try:
        return datetime.strptime(path.name[:19], "%Y-%m-%d-%H-%M-%S")
    except ValueError:
        return datetime.min


# Los productos nuevos, con fecha y hora en el nombre, van primero.
# Los antiguos conservan su orden numérico.
paths.sort(key=lambda path: (fecha_producto(path), path.name), reverse=True)

products = []

for path in paths:
    item = json.loads(path.read_text(encoding="utf-8"))

    if not isinstance(item, dict):
        raise SystemExit(f"ERROR: {path} no contiene un producto JSON")

    products.append(item)

output = root / "data" / "products.json"

output.write_text(
    json.dumps(products, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8"
)

print(f"Catálogo generado: {len(products)} productos")
