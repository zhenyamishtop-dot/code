#!/usr/bin/env python3
"""Fast search for the model gift that is cheapest to buy out completely on
Portals, across all collections, via the Gift Satellite API.

Usage:
    COLL_FLOOR_MAX=10 GIFT_SATELLITE_TOKEN=... python3 fast_cheapest_buyout.py

Speed-ups over cheapest_buyout_all.py:
  * models of a collection are queried in batches (`models=a,b,c,...`): when a
    batch returns fewer than 50 lots (the API cap) it gives exact lots for
    every model in it with a single request; capped batches are split in half;
  * a single model that alone hits the cap has buyout >= sum of its 50
    cheapest lots, so it is dropped when that already exceeds the best found;
  * models whose floor is above MARGIN x best are skipped.
Writes portals_fast_cheapest_buyout.csv sorted by full buyout.
"""
import csv
import json
import os
from collections import defaultdict

import portals_lots as pl

pl.DELAY = float(os.environ.get("DELAY", "0.5"))
MARGIN = 1.5
BATCH = 40
COLL_FLOOR_MAX = float(os.environ.get("COLL_FLOOR_MAX", "inf"))
FLOORS = "portals_all_floors.json"
OUT = "portals_fast_cheapest_buyout.csv"

best = float("inf")
results = {}
requests = 0


def record(coll, model, items, capped=False):
    global best
    prices = sorted(float(x["normalizedPrice"]) for x in items)
    if not prices:
        return
    buyout = sum(prices)
    results[(coll, model)] = {
        "collection": coll, "model": model,
        "portals_lots": f"{len(prices)}+" if capped else len(prices),
        "portals_floor_ton": round(prices[0], 3),
        "portals_buyout_ton": f">={round(buyout, 3)}" if capped else round(buyout, 3),
        "_b": buyout,
    }
    if not capped and buyout < best:
        best = buyout
        print(f"NEW BEST {coll} / {model}: {len(prices)} lots, floor {prices[0]}, "
              f"buyout {round(buyout, 3)}", flush=True)


def search(coll, models):
    global requests
    requests += 1
    return pl.search(coll, ",".join(models))


def resolve(coll, models):
    items = search(coll, models)
    if len(items) < pl.CAP:
        by_model = defaultdict(list)
        for x in items:
            by_model[x["modelName"]].append(x)
        for m in models:
            record(coll, m, by_model.get(m, []))
        return
    if len(models) == 1:
        lower = sum(float(x["normalizedPrice"]) for x in items)
        if lower < best:  # rare: many lots but still possibly cheap
            full = []
            pl.collect(coll, models[0], BACKDROPS, "backdrops", (), SYMBOLS, full)
            uniq = {x.get("slug") or x.get("_id"): x for x in full}
            record(coll, models[0], list(uniq.values()))
        else:
            record(coll, models[0], items, capped=True)
        return
    mid = len(models) // 2
    resolve(coll, models[:mid])
    resolve(coll, [m for m in models[mid:] if floor_of[(coll, m)] <= best * MARGIN])


def main():
    floors = [tuple(x) for x in json.load(open(FLOORS, encoding="utf-8"))]
    coll_floor = {}
    for f, coll, _ in floors:
        coll_floor[coll] = min(f, coll_floor.get(coll, f))
    per_coll = defaultdict(list)
    for f, coll, m in sorted(floors):
        if coll_floor[coll] <= COLL_FLOOR_MAX:
            per_coll[coll].append(m)
            floor_of[(coll, m)] = f
    print(f"collections: {len(per_coll)}, models: {sum(map(len, per_coll.values()))}", flush=True)
    # cheapest collections first, so a low `best` is found early
    for i, coll in enumerate(sorted(per_coll, key=coll_floor.get), 1):
        models = [m for m in per_coll[coll] if floor_of[(coll, m)] <= best * MARGIN]
        for j in range(0, len(models), BATCH):
            chunk = [m for m in models[j:j + BATCH] if floor_of[(coll, m)] <= best * MARGIN]
            if chunk:
                resolve(coll, chunk)
        print(f"collection {i}/{len(per_coll)} {coll}: done, requests {requests}, "
              f"best {round(best, 3)}", flush=True)

    rows = sorted(results.values(), key=lambda r: r["_b"])
    with open(OUT, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=[k for k in rows[0] if k != "_b"])
        w.writeheader()
        for r in rows:
            w.writerow({k: v for k, v in r.items() if k != "_b"})
    print("DONE requests", requests, "best", round(best, 3), flush=True)
    for r in rows[:10]:
        print("TOP", r["collection"], "/", r["model"], r["portals_lots"],
              r["portals_floor_ton"], r["portals_buyout_ton"], flush=True)


floor_of = {}
if __name__ == "__main__":
    if not pl.TOKEN:
        raise SystemExit("Set GIFT_SATELLITE_TOKEN")
    BACKDROPS = [b["name"] for b in pl.get("/gift/backdrops") if "," not in b["name"]]
    SYMBOLS = [s["name"] for s in pl.get("/gift/symbols") if "," not in s["name"]]
    main()
