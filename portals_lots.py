#!/usr/bin/env python3
"""Count Portals listings and full buyout cost for each model gift in
casemint_model_gifts.csv, using the Gift Satellite API.

Usage:
    GIFT_SATELLITE_TOKEN=... python3 portals_lots.py

Writes:
    portals_raw/<collection>__<model>.json   raw API responses
    portals_lots.csv                          per-model summary
"""
import csv
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

BASE = "https://gift-satellite.dev/api"
TOKEN = os.environ.get("GIFT_SATELLITE_TOKEN")
SRC = Path("casemint_model_gifts.csv")
RAW = Path("portals_raw")
OUT = Path("portals_lots.csv")
DELAY = float(os.environ.get("DELAY", "0.4"))


def get(path, params):
    url = f"{BASE}{path}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={
        "Authorization": TOKEN,
        "Content-Type": "application/json",
        "User-Agent": "portals-lots-script",
    })
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429 or e.code >= 500:
                time.sleep(2 ** attempt)
                continue
            raise RuntimeError(f"{e.code} {e.read()[:300]!r} for {url}")
        except urllib.error.URLError:
            time.sleep(2 ** attempt)
    raise RuntimeError(f"failed after retries: {url}")


def price(item):
    for k in ("normalizedPrice", "price", "priceTon", "price_ton"):
        if item.get(k) is not None:
            return float(item[k])
    return None


def main():
    if not TOKEN:
        sys.exit("Set GIFT_SATELLITE_TOKEN")
    RAW.mkdir(exist_ok=True)
    rows = list(csv.DictReader(SRC.open(encoding="utf-8")))
    out = []
    for i, row in enumerate(rows, 1):
        coll, model = row["collection"], row["model"]
        raw_file = RAW / f"{coll}__{model}.json".replace("/", "_")
        if raw_file.exists():
            data = json.loads(raw_file.read_text())
        else:
            data = get(f"/search/portals/{urllib.parse.quote(coll)}",
                       {"models": model, "backdrops": "", "symbols": "",
                        "starsOnly": "false"})
            raw_file.write_text(json.dumps(data, ensure_ascii=False))
            time.sleep(DELAY)
        items = data.get("data", []) if isinstance(data, dict) else data
        prices = sorted(p for p in (price(x) for x in items) if p is not None)
        out.append({
            "collection": coll,
            "model": model,
            "casemint_price_ton": row["price_ton"],
            "portals_lots": len(items),
            "portals_floor_ton": round(prices[0], 3) if prices else "",
            "portals_buyout_ton": round(sum(prices), 3) if prices else 0,
        })
        print(f"[{i}/{len(rows)}] {coll} / {model}: {len(items)} lots, "
              f"buyout {out[-1]['portals_buyout_ton']}", flush=True)
    with OUT.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(out[0]))
        w.writeheader()
        w.writerows(out)
    print("lots total:", sum(r["portals_lots"] for r in out),
          "buyout total TON:", round(sum(r["portals_buyout_ton"] for r in out), 2))


if __name__ == "__main__":
    main()
