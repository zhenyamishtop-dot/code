#!/usr/bin/env python3
"""Count Portals listings and full buyout cost for each model gift in
casemint_model_gifts.csv, using the Gift Satellite API.

Usage:
    GIFT_SATELLITE_TOKEN=... python3 portals_lots.py

The search endpoint returns at most 50 cheapest lots per query and has no
pagination, so when a query hits the cap it is split by backdrops (and, if a
single backdrop is still capped, by symbols) until every part is below the cap.

Writes:
    portals_raw/<collection>__<model>.json   all collected lots per model
    portals_lots.csv                          per-model summary
"""
import csv
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

BASE = "https://gift-satellite.dev/api"
TOKEN = os.environ.get("GIFT_SATELLITE_TOKEN")
SRC = Path("casemint_model_gifts.csv")
RAW = Path("portals_raw")
OUT = Path("portals_lots.csv")
DELAY = float(os.environ.get("DELAY", "1.2"))
CAP = 50
_last = 0.0


def get(path, params=None):
    global _last
    url = f"{BASE}{path}"
    if params:
        url += "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={
        "Authorization": TOKEN,
        "User-Agent": "portals-lots-script",
    })
    for attempt in range(8):
        wait = DELAY - (time.time() - _last)
        if wait > 0:
            time.sleep(wait)
        _last = time.time()
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                data = json.load(r)
                return data.get("data", data) if isinstance(data, dict) else data
        except urllib.error.HTTPError as e:
            if e.code == 429 or e.code >= 500:
                time.sleep(min(60, 3 * 2 ** attempt))
                continue
            raise RuntimeError(f"{e.code} {e.read()[:300]!r} for {url}")
        except (urllib.error.URLError, TimeoutError):
            time.sleep(min(60, 3 * 2 ** attempt))
    raise RuntimeError(f"failed after retries: {url}")


def search(coll, model, backdrops=(), symbols=()):
    return get(f"/search/portals/{urllib.parse.quote(coll)}", {
        "models": model,
        "backdrops": ",".join(backdrops),
        "symbols": ",".join(symbols),
        "starsOnly": "false",
    })


def collect(coll, model, names, kind, fixed_backdrops, symbols_all, out):
    """Split `names` (backdrops or symbols) until each query is under the cap."""
    bd = names if kind == "backdrops" else fixed_backdrops
    sy = names if kind == "symbols" else ()
    items = search(coll, model, bd, sy)
    if len(items) < CAP:
        out.extend(items)
        return
    if len(names) == 1:
        if kind == "backdrops":
            collect(coll, model, symbols_all, "symbols", names, symbols_all, out)
        else:
            print(f"  WARNING: {coll}/{model} {fixed_backdrops}+{names} still "
                  f"capped at {CAP}", flush=True)
            out.extend(items)
        return
    mid = len(names) // 2
    collect(coll, model, names[:mid], kind, fixed_backdrops, symbols_all, out)
    collect(coll, model, names[mid:], kind, fixed_backdrops, symbols_all, out)


def norm(s):
    return s.replace("’", "'").replace("‘", "'").strip().lower()


_models_cache = {}


def canonical_model(coll, model):
    if coll not in _models_cache:
        names = set()
        for market in ("portals", "mrkt"):
            try:
                names |= set(get("/history/models-floors",
                                 {"collectionName": coll, "market": market}) or {})
            except RuntimeError:
                pass
        _models_cache[coll] = {norm(n): n for n in names}
    return _models_cache[coll].get(norm(model), model)


def main():
    if not TOKEN:
        sys.exit("Set GIFT_SATELLITE_TOKEN")
    RAW.mkdir(exist_ok=True)
    backdrops = [b["name"] for b in get("/gift/backdrops") if "," not in b["name"]]
    symbols = [s["name"] for s in get("/gift/symbols") if "," not in s["name"]]
    collections = {norm(c["name"]): c["name"] for c in get("/gift/collections", {"premarket": "0"})}
    rows = list(csv.DictReader(SRC.open(encoding="utf-8")))
    out = []
    for i, row in enumerate(rows, 1):
        coll, model = row["collection"], row["model"]
        raw_file = RAW / f"{coll}__{model}.json".replace("/", "_")
        note = ""
        if raw_file.exists():
            items = json.loads(raw_file.read_text(encoding="utf-8"))
        elif norm(coll) not in collections:
            items, note = [], "collection not on markets"
        else:
            coll = collections[norm(coll)]
            model = canonical_model(coll, model)
            try:
                items = search(coll, model)
            except RuntimeError as e:
                if not str(e).startswith("400"):
                    raise
                items, note = [], "model not recognised by API"
                print(f"  SKIP {coll}/{model}: {e}", flush=True)
                coll, model = row["collection"], row["model"]
                out.append({
                    "collection": coll, "model": model,
                    "casemint_price_ton": row["price_ton"],
                    "portals_lots": 0, "portals_locked_lots": 0,
                    "portals_floor_ton": "", "portals_buyout_ton": 0, "note": note,
                })
                continue
            if len(items) >= CAP:
                items = []
                collect(coll, model, backdrops, "backdrops", (), symbols, items)
            uniq = {}
            for x in items:
                uniq[x.get("slug") or x.get("_id")] = x
            items = sorted(uniq.values(), key=lambda x: float(x["normalizedPrice"]))
            raw_file.write_text(json.dumps(items, ensure_ascii=False), encoding="utf-8")
        prices = [float(x["normalizedPrice"]) for x in items]
        out.append({
            "collection": row["collection"],
            "model": row["model"],
            "casemint_price_ton": row["price_ton"],
            "portals_lots": len(items),
            "portals_locked_lots": sum(1 for x in items if x.get("isLocked")),
            "portals_floor_ton": round(prices[0], 3) if prices else "",
            "portals_buyout_ton": round(sum(prices), 3),
            "note": note,
        })
        print(f"[{i}/{len(rows)}] {coll} / {model}: {len(items)} lots, "
              f"buyout {out[-1]['portals_buyout_ton']} TON", flush=True)
    with OUT.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(out[0]))
        w.writeheader()
        w.writerows(out)
    print("DONE lots total:", sum(r["portals_lots"] for r in out),
          "buyout total TON:", round(sum(r["portals_buyout_ton"] for r in out), 2))


if __name__ == "__main__":
    main()
