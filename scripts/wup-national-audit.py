#!/usr/bin/env python3
import csv, json, hashlib, sys
from pathlib import Path

def norm(v): return ' '.join((v or '').strip().casefold().split())

def main():
    root=Path(sys.argv[1]) if len(sys.argv)>1 else Path('data/wup')
    files=list(root.rglob('*.csv')) if root.exists() else []
    city=[p for p in files if any(x in p.name.casefold() for x in ('city','urban','population')) and 'metadata' not in p.name.casefold()]
    if not city: raise SystemExit('no-city-level-wup-csv-found')
    p=city[0]
    with p.open(encoding='utf-8-sig',newline='') as f:
        r=csv.DictReader(f); rows=list(r)
    assert r.fieldnames, 'missing-wup-header'
    id_candidates=['ID','id','Urban area ID','Urban Area ID','LocID','location_id']
    pop_candidates=['Population','population','Pop2025','Population 2025','2025 Population']
    idcol=next((c for c in id_candidates if c in r.fieldnames),None)
    popcol=next((c for c in pop_candidates if c in r.fieldnames),None)
    if not idcol or not popcol: raise SystemExit(f'wup-schema-mismatch:id={idcol}:population={popcol}:columns={r.fieldnames}')
    ids=[norm(x.get(idcol)) for x in rows if norm(x.get(idcol))]
    if len(ids)!=len(set(ids)): raise SystemExit('duplicate-wup-identifiers')
    universe=[x for x in rows if float((x.get(popcol) or '0').replace(',',''))>=50000]
    out={'source_file':str(p),'source_sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'source_rows':len(rows),'population_threshold':50000,'universe_rows':len(universe),'identifier_column':idcol,'population_column':popcol}
    Path('wup-national-audit.json').write_text(json.dumps(out,indent=2)+'\n')
    print(json.dumps(out,indent=2))
if __name__=='__main__': main()
