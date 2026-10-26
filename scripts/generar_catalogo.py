#!/usr/bin/env python3
"""Regenera data/products.json sin cambiar el orden de los productos existentes."""
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
folder = root / "data" / "products"
paths = sorted(folder.glob("*.json"))
if not paths:
    raise SystemExit("ERROR: no hay productos; no se reemplaza el catálogo")
products = []
for path in paths:
    item = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(item, dict):
        raise SystemExit(f"ERROR: {path} no contiene un producto JSON")
    products.append(item)
output = root / "data" / "products.json"
output.write_text(json.dumps(products, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Catálogo generado: {len(products)} productos")
