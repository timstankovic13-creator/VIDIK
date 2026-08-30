#!/usr/bin/env python3
"""Deterministic WUP <-> Statistics Canada municipality reconciliation.

Usage:
  python3 scripts/wup-statcan-reconcile.py --wup WUP.csv --statcan STATCAN.csv --out reconciliation.json

Both inputs must contain a stable municipality identifier. Preferred keys are
CSDUID/CSD_ID/geo_uid. Name matching is deliberately opt-in and never silently
used as an identifier.
"""
import argparse, csv, json, hashlib, sys
from pathlib import Path

ID_KEYS = ["CSDUID", "CSD_ID", "csduid", "csd_id", "geo_uid", "municipality_id", "city_id"]
NAME_KEYS = ["name", "city", "municipality", "CSDNAME", "CSD_name"]

def load(path):
    with open(path, encoding="utf-8-sig", newline="") as f:
        r = csv.DictReader(f)
        if not r.fieldnames: raise SystemExit(f"missing-header:{path}")
        fields = [x.strip() for x in r.fieldnames]
        if len(fields) != len(set(fields)): raise SystemExit(f"duplicate-columns:{path}")
        rows = list(r)
    return fields, rows

def pick(fields, candidates):
    low = {f.lower(): f for f in fields}
    for c in candidates:
        if c.lower() in low: return low[c.lower()]
    return None

def digest(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for b in iter(lambda: f.read(1024 * 1024), b""): h.update(b)
    return h.hexdigest()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--wup", required=True); ap.add_argument("--statcan", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    wf, wr = load(a.wup); sf, sr = load(a.statcan)
    wi, si = pick(wf, ID_KEYS), pick(sf, ID_KEYS)
    if not wi or not si:
        raise SystemExit("stable-id-required:wup-and-statcan-must-contain-CSDUID-compatible-key")
    wmap, smap = {}, {}
    for i, row in enumerate(wr, 2):
        k = row.get(wi, "").strip()
        if not k: raise SystemExit(f"empty-wup-id:row={i}")
        if k in wmap: raise SystemExit(f"duplicate-wup-id:{k}")
        wmap[k] = row
    for i, row in enumerate(sr, 2):
        k = row.get(si, "").strip()
        if not k: raise SystemExit(f"empty-statcan-id:row={i}")
        if k in smap: raise SystemExit(f"duplicate-statcan-id:{k}")
        smap[k] = row
    matched = sorted(set(wmap) & set(smap)); only_wup = sorted(set(wmap)-set(smap)); only_statcan = sorted(set(smap)-set(wmap))
    report = {
      "schema_version":"1.0.0", "status":"pass" if not only_wup and not only_statcan else "reconciliation-gaps",
      "wup_rows":len(wr), "statcan_rows":len(sr), "matched":len(matched),
      "only_wup":len(only_wup), "only_statcan":len(only_statcan),
      "wup_id_column":wi, "statcan_id_column":si,
      "only_wup_ids":only_wup, "only_statcan_ids":only_statcan,
      "wup_sha256":digest(a.wup), "statcan_sha256":digest(a.statcan)
    }
    Path(a.out).write_text(json.dumps(report, indent=2)+"\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0 if report["status"] == "pass" else 2

if __name__ == "__main__": sys.exit(main())
