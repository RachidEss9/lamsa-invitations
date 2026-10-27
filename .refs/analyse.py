"""Analyse the LAMSA reference images: size, palette, border structure."""
import os, json
from PIL import Image

DIR = os.path.join(os.path.dirname(__file__))
files = sorted(f for f in os.listdir(DIR) if f.lower().endswith(".jpg"))


def hexc(rgb):
    return "#%02x%02x%02x" % rgb


out = []
for name in files:
    try:
        im = Image.open(os.path.join(DIR, name)).convert("RGB")
    except Exception as e:  # noqa: BLE001
        out.append({"file": name, "error": str(e)})
        continue
    w, h = im.size
    small = im.resize((120, int(120 * h / w)) if w >= h else (int(120 * w / h), 120))
    # dominant palette
    quant = small.quantize(colors=8, method=Image.MEDIANCUT)
    pal = quant.getpalette()
    counts = sorted(quant.getcolors(), reverse=True)
    total = sum(c for c, _ in counts)
    palette = []
    for count, idx in counts[:6]:
        rgb = tuple(pal[idx * 3: idx * 3 + 3])
        palette.append({"hex": hexc(rgb), "share": round(count / total, 2)})

    px = small.load()
    sw, sh = small.size
    # border ring vs center: mean brightness difference
    def mean(region):
        vals = []
        for x, y in region:
            r, g, b = px[x, y]
            vals.append((r + g + b) / 3)
        return sum(vals) / len(vals) if vals else 0

    ring = [(x, y) for x in range(sw) for y in range(sh)
            if x < 6 or y < 6 or x >= sw - 6 or y >= sh - 6]
    inner = [(x, y) for x in range(12, sw - 12) for y in range(12, sh - 12)]
    ring_m, inner_m = mean(ring), mean(inner)
    # horizontal band structure: brightness of top/mid/bottom thirds
    thirds = []
    for i in range(3):
        region = [(x, y) for x in range(sw) for y in range(sh * i // 3, sh * (i + 1) // 3)]
        thirds.append(round(mean(region)))
    out.append({
        "file": name,
        "size": [w, h],
        "orient": "landscape" if w > h * 1.05 else ("portrait" if h > w * 1.05 else "square"),
        "palette": palette,
        "ring_vs_inner": [round(ring_m), round(inner_m)],
        "thirds": thirds,
        "mean": round((ring_m + inner_m) / 2),
    })

print(json.dumps(out, indent=1))
