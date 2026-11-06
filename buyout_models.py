#!/usr/bin/env python3
"""Cost and count of buying out given model gifts across markets, via the
Gift Satellite API:
  * Portals: every lot (full buyout);
  * Telegram, MRKT, Tonnel, Getgems: lots priced up to MAX_OTHER TON;
    on Telegram only lots priced in TON (not Stars).
The same gift listed on several markets is counted once, at its cheapest price.

Usage:
    GIFT_SATELLITE_TOKEN=... python3 buyout_models.py "Snake Box/Donut Box" "Lunar Snake/Hissium"
Writes buyout_<collection>_<model>.csv with every lot that would be bought.
"""
import csv
import sys
import urllib.parse

import portals_lots as pl

pl.DELAY = 0.35
MAX_OTHER = 10.0
MARKETS = ["portals", "tg", "mrkt", "tonnel", "getgems"]
SOFT_CAP = 50  # tg seems to return up to 100; anything >= 50 is treated as possibly capped


def search(market, coll, model, backdrops=()):
    return pl.get(f"/search/{market}/{urllib.parse.quote(coll)}", {
        "models": model, "backdrops": ",".join(backdrops),
        "symbols": "", "starsOnly": "false",
    })


def wanted(market, x):
    p = float(x["normalizedPrice"])
    if market == "portals":
        return True
    if market == "tg" and str(x.get("currency", "")).lower() != "ton":
        return False
    return p <= MAX_OTHER


def complete(market, items):
    """True if the response surely holds every lot we want."""
    if len(items) < SOFT_CAP:
        return True
    if market == "portals":
        return False
    # sorted by price: once a returned lot is above the limit, all wanted ones are in
    return max(float(x["normalizedPrice"]) for x in items) > MAX_OTHER


def fetch(market, coll, model, backdrops):
    items = search(market, coll, model, backdrops)
    if complete(market, items):
        return items
    if len(backdrops) == 1:
        print(f"  WARNING {market} {coll}/{model} {backdrops} may be capped", flush=True)
        return items
    mid = len(backdrops) // 2
    return fetch(market, coll, model, backdrops[:mid]) + fetch(market, coll, model, backdrops[mid:])


def main(pairs):
    backdrops = [b["name"] for b in pl.get("/gift/backdrops") if "," not in b["name"]]
    grand_n = grand_sum = 0
    for pair in pairs:
        coll, model = pair.split("/", 1)
        lots = {}
        raw_counts = {}
        for mk in MARKETS:
            items = search(mk, coll, model)
            if not complete(mk, items):
                items = fetch(mk, coll, model, backdrops)
            uniq = {x["slug"]: x for x in items}
            sel = [x for x in uniq.values() if wanted(mk, x)]
            raw_counts[mk] = len(sel)
            for x in sel:
                slug, p = x["slug"], float(x["normalizedPrice"])
                if slug not in lots or p < lots[slug]["price"]:
                    lots[slug] = {"slug": slug, "market": x["market"], "price": p,
                                  "backdrop": x.get("backdropName"), "symbol": x.get("symbolName"),
                                  "locked": x.get("isLocked", False)}
        rows = sorted(lots.values(), key=lambda r: r["price"])
        by_mk = {}
        for r in rows:
            n, s = by_mk.get(r["market"], (0, 0.0))
            by_mk[r["market"]] = (n + 1, s + r["price"])
        total = sum(r["price"] for r in rows)
        grand_n += len(rows)
        grand_sum += total
        print(f"\n=== {coll} / {model}")
        print("  listed (before cross-market dedupe):", raw_counts)
        for mk, (n, s) in sorted(by_mk.items()):
            print(f"  {mk:9s} {n:4d} lots  {s:10.2f} TON")
        print(f"  TOTAL     {len(rows):4d} gifts {total:10.2f} TON  "
              f"(min {rows[0]['price'] if rows else '-'}, max {rows[-1]['price'] if rows else '-'})")
        fn = f"buyout_{coll}_{model}.csv".replace(" ", "_")
        with open(fn, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=list(rows[0]))
            w.writeheader()
            w.writerows(rows)
    print(f"\nGRAND TOTAL {grand_n} gifts, {grand_sum:.2f} TON")


if __name__ == "__main__":
    if not pl.TOKEN:
        raise SystemExit("Set GIFT_SATELLITE_TOKEN")
    main(sys.argv[1:])
