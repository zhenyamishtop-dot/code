#!/usr/bin/env python3
"""Find the item from a SKINOZ list that is cheapest to buy out completely on
the Steam Community Market (CS2), leaving zero sell listings.

Usage:
    python3 steam_list_buyout.py skinoz_market_cs2.csv

Scans Steam market search sorted by price (cheapest first, 10 items per page),
keeps items whose name is in the list, and for those whose lower bound
(listings x lowest price) is below the best full buyout found so far fetches
every listing to get the exact buyout. Stops once the lowest price on the page
exceeds the best buyout. Prices are in USD as the buyer pays (fees included).
Writes steam_list_buyout.csv with every exactly-priced candidate.
"""
import csv
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

DELAY = 3.0
OUT = "steam_list_buyout.csv"
_last = 0.0


def get(url):
    global _last
    for attempt in range(8):
        wait = DELAY - (time.time() - _last)
        if wait > 0:
            time.sleep(wait)
        _last = time.time()
        try:
            with urllib.request.urlopen(urllib.request.Request(
                    url, headers={"User-Agent": "Mozilla/5.0"}), timeout=30) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            print(f"HTTP {e.code}, backing off", flush=True)
            time.sleep(min(300, 15 * 2 ** attempt))
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
            time.sleep(10 * (attempt + 1))
    raise RuntimeError("gave up: " + url)


def search_page(start):
    q = {"appid": 730, "norender": 1, "count": 10, "start": start,
         "sort_column": "price", "sort_dir": "asc", "currency": 1}
    return get("https://steamcommunity.com/market/search/render/?" + urllib.parse.urlencode(q))


def exact_buyout(name, n):
    """Sum of all listing prices (buyer pays: price + fee), in cents."""
    total, count, start = 0, 0, 0
    while start < n:
        url = (f"https://steamcommunity.com/market/listings/730/{urllib.parse.quote(name)}"
               f"/render/?start={start}&count=100&currency=1&format=json")
        d = get(url)
        info = d.get("listinginfo") or {}
        if not info:
            break
        for li in info.values():
            p = li.get("converted_price", li.get("price", 0)) + li.get("converted_fee", li.get("fee", 0))
            total += p
            count += 1
        start += 100
    return total, count


def main(path):
    names = {}
    with open(path, encoding="utf-8-sig") as f:
        for row in csv.DictReader(f, delimiter=";"):
            names[row["Название"].strip()] = row
    print("names in list:", len(names), flush=True)
    best, best_row = float("inf"), None
    found = []
    start = 0
    while True:
        d = search_page(start)
        res = d.get("results") or []
        if not res:
            print("no more results at", start, flush=True)
            break
        for r in res:
            name, n, p = r["hash_name"], r["sell_listings"], r["sell_price"]
            if name not in names or n <= 0:
                continue
            if n * p >= best:
                continue
            if n == 1:
                total, cnt = p, 1
            elif n > 300:
                continue
            else:
                total, cnt = exact_buyout(name, n)
                if cnt < n:  # some listings not visible: fall back to lower bound
                    print(f"  note {name}: saw {cnt}/{n} listings", flush=True)
                    continue
            row = {"name": name, "type": names[name].get("Тип", ""),
                   "listings": cnt, "min_price_usd": p / 100, "buyout_usd": total / 100}
            found.append(row)
            if total < best:
                best, best_row = total, row
                print(f"NEW BEST {name}: {cnt} listings, min ${p/100:.2f}, buyout ${total/100:.2f}",
                      flush=True)
        low = res[0]["sell_price"]
        if start % 200 == 0:
            print(f"page start {start}, price now ${low/100:.2f}, best "
                  f"${best/100 if best < float('inf') else 0:.2f}", flush=True)
        if low >= best:
            break
        start += 10
    found.sort(key=lambda r: r["buyout_usd"])
    with open(OUT, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["name", "type", "listings", "min_price_usd", "buyout_usd"])
        w.writeheader()
        w.writerows(found)
    print("DONE best", best_row, flush=True)
    for r in found[:10]:
        print("TOP", r, flush=True)


if __name__ == "__main__":
    main(sys.argv[1])
