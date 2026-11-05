#!/usr/bin/env python3
"""Fast search for the model gift that is cheapest to buy out completely on
Portals, across all collections, via the Gift Satellite API.

Usage:
    COLL_FLOOR_MAX=10 GIFT_SATELLITE_TOKEN=... python3 fast_cheapest_buyout.py

Env options: COLL_FLOOR_MAX (only collections whose Portals floor is at most
this), INITIAL_BEST (known buyout bound to prune from the start), MARGIN,
BATCH, WORKERS, RPS, SKIP_COLLECTIONS (comma-separated, already covered).

How it stays fast:
  * the API allows 4 requests/second but each search takes ~2 s, so several
    collections are processed in parallel under a shared rate limiter;
  * models of a collection are queried in small batches (`models=a,b,...`):
    a batch under the 50-lot cap gives exact lots for all its models at once;
  * from a capped batch, every model whose visible lots already sum to at
    least the best buyout is dropped; the rest are re-queried in a smaller
    batch, down to single models;
  * a single model that alone hits the cap is dropped unless its 50 cheapest
    lots are still below the best (then it is split by backdrops/symbols);
  * models whose floor is above MARGIN x best are skipped.
Writes portals_fast_cheapest_buyout.csv sorted by full buyout.
"""
import csv
import json
import os
import threading
import time
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor

import portals_lots as pl

pl.DELAY = 0
MARGIN = float(os.environ.get("MARGIN", "1.0"))
BATCH = int(os.environ.get("BATCH", "6"))
WORKERS = int(os.environ.get("WORKERS", "4"))
RPS = float(os.environ.get("RPS", "3.5"))
COLL_FLOOR_MAX = float(os.environ.get("COLL_FLOOR_MAX", "inf"))
SKIP = {s.strip() for s in os.environ.get("SKIP_COLLECTIONS", "").split(",") if s.strip()}
FLOORS = "portals_all_floors.json"
OUT = "portals_fast_cheapest_buyout.csv"

best = float(os.environ.get("INITIAL_BEST", "inf"))
results = {}
requests = 0
floor_of = {}
lock = threading.Lock()
rate_lock = threading.Lock()
next_slot = 0.0


def search(coll, models):
    global requests, next_slot
    with rate_lock:
        now = time.time()
        wait = next_slot - now
        next_slot = max(now, next_slot) + 1.0 / RPS
        requests += 1
    if wait > 0:
        time.sleep(wait)
    return pl.search(coll, ",".join(models))


def record(coll, model, items, capped=False):
    global best
    prices = sorted(float(x["normalizedPrice"]) for x in items)
    if not prices:
        return
    buyout = sum(prices)
    with lock:
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


def alive(coll, m):
    return floor_of[(coll, m)] <= best * MARGIN


def resolve(coll, models):
    models = [m for m in models if alive(coll, m)]
    if not models:
        return
    items = search(coll, models)
    by_model = defaultdict(list)
    for x in items:
        by_model[x["modelName"]].append(x)
    if len(items) < pl.CAP:
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
    rest = []
    for m in models:
        part = by_model.get(m, [])
        if part and sum(float(x["normalizedPrice"]) for x in part) >= best:
            record(coll, m, part, capped=True)  # already too expensive
        else:
            rest.append(m)
    if len(rest) == len(models):  # no progress: halve
        mid = len(rest) // 2
        resolve(coll, rest[:mid])
        resolve(coll, rest[mid:])
    elif len(rest) <= 2:
        for m in rest:
            resolve(coll, [m])
    else:
        resolve(coll, rest)


def do_collection(coll, models):
    for j in range(0, len(models), BATCH):
        resolve(coll, models[j:j + BATCH])
    print(f"collection done {coll}: requests {requests}, best {round(best, 3)}", flush=True)


def main():
    floors = [tuple(x) for x in json.load(open(FLOORS, encoding="utf-8"))]
    coll_floor = {}
    for f, coll, _ in floors:
        coll_floor[coll] = min(f, coll_floor.get(coll, f))
    per_coll = defaultdict(list)
    for f, coll, m in sorted(floors):
        if coll_floor[coll] <= COLL_FLOOR_MAX and coll not in SKIP:
            per_coll[coll].append(m)
            floor_of[(coll, m)] = f
    print(f"collections: {len(per_coll)}, models: {sum(map(len, per_coll.values()))}", flush=True)
    with ThreadPoolExecutor(WORKERS) as ex:
        futs = [ex.submit(do_collection, c, per_coll[c]) for c in sorted(per_coll, key=coll_floor.get)]
        for f in futs:
            f.result()

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


if __name__ == "__main__":
    if not pl.TOKEN:
        raise SystemExit("Set GIFT_SATELLITE_TOKEN")
    BACKDROPS = [b["name"] for b in pl.get("/gift/backdrops") if "," not in b["name"]]
    SYMBOLS = [s["name"] for s in pl.get("/gift/symbols") if "," not in s["name"]]
    main()
