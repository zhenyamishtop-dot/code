#!/usr/bin/env python3
"""Find the model gifts (across ALL collections and models, not only the CSV)
that are cheapest to buy out completely on Portals, via the Gift Satellite API.

Usage:
    GIFT_SATELLITE_TOKEN=... python3 cheapest_buyout_all.py

Full buyout of a model is never below its floor, so models are checked in
order of their Portals floor and the search stops once the floor exceeds
MARGIN x the best buyout found (the margin covers slightly stale floors).

Writes portals_cheapest_buyout_all.csv (every model checked, sorted by buyout).
"""
import csv
import json

import portals_lots as pl

MARGIN = 1.5
OUT = "portals_cheapest_buyout_all.csv"


def main():
    if not pl.TOKEN:
        raise SystemExit("Set GIFT_SATELLITE_TOKEN")
    collections = [c["name"] for c in pl.get("/gift/collections", {"premarket": "0"})]
    floors = []
    for i, coll in enumerate(collections, 1):
        d = pl.get("/history/models-floors", {"collectionName": coll, "market": "portals"}) or {}
        floors += [(float(f), coll, m) for m, f in d.items() if f]
        print(f"floors {i}/{len(collections)} {coll}: {len(d)} models", flush=True)
    floors.sort()
    print("models with Portals floor:", len(floors), flush=True)
    json.dump(floors, open("portals_all_floors.json", "w", encoding="utf-8"), ensure_ascii=False)

    best = float("inf")
    results = []
    for n, (floor, coll, model) in enumerate(floors, 1):
        if floor > best * MARGIN:
            break
        items = pl.search(coll, model)
        capped = len(items) >= pl.CAP
        prices = sorted(float(x["normalizedPrice"]) for x in items)
        buyout = sum(prices)
        if capped and buyout < best:
            items = []
            pl.collect(coll, model, pl_backdrops, "backdrops", (), pl_symbols, items)
            uniq = {x.get("slug") or x.get("_id"): x for x in items}
            prices = sorted(float(x["normalizedPrice"]) for x in uniq.values())
            buyout, capped = sum(prices), False
        if not prices:
            continue
        results.append({
            "collection": coll, "model": model,
            "portals_lots": f"{len(prices)}+" if capped else len(prices),
            "portals_floor_ton": round(prices[0], 3),
            "portals_buyout_ton": f">={round(buyout, 3)}" if capped else round(buyout, 3),
            "_b": buyout,
        })
        if not capped and buyout < best:
            best = buyout
            print(f"NEW BEST {coll} / {model}: {len(prices)} lots, floor {prices[0]}, "
                  f"buyout {round(buyout, 3)}", flush=True)
        if n % 25 == 0:
            print(f"checked {n}, floor now {floor}, best {round(best, 3)}", flush=True)

    results.sort(key=lambda r: r["_b"])
    with open(OUT, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=[k for k in results[0] if k != "_b"])
        w.writeheader()
        for r in results:
            w.writerow({k: v for k, v in r.items() if k != "_b"})
    print("DONE checked", len(results), "best", round(best, 3), flush=True)


if __name__ == "__main__":
    pl_backdrops = [b["name"] for b in pl.get("/gift/backdrops") if "," not in b["name"]]
    pl_symbols = [s["name"] for s in pl.get("/gift/symbols") if "," not in s["name"]]
    main()
