#!/usr/bin/env python3
"""Fail-closed enrichment of the exact 4,690 F21 extension rows.

The F21 workbook defines membership only. Population values are taken from the
independent JRC GHS-WUP-MTUC 2025 statistics package. No value is imputed.
A row is accepted only when the JRC record is uniquely identified by country,
normalised city name, and (when available) a coordinate consistency check.
Ambiguous/unmatched rows are reported and cause a non-zero exit; no canonical
manifest is emitted unless all 4,690 rows are resolved exactly once.
"""
import argparse, csv, hashlib, io, json, math, re, sys, zipfile
from pathlib import Path
import requests
from openpyxl import load_workbook

F21_URL='https://population.un.org/wup/assets/Download/Cities/WUP2025-F21-DEGURBA-Cities_Pop.xlsx'
JRC_URL='https://jeodpp.jrc.ec.europa.eu/ftp/jrc-opendata/GHSL/GHS_WUP_MTUC_GLOBE_R2025A/V1-1/GHS_WUP_MTUC_GLOBE_R2025A_V1_1_statistics.zip'
EXPECTED=4690

def norm(v):
    s='' if v is None else str(v)
    s=s.casefold().strip()
    s=re.sub(r'[\u2018\u2019\u201a\u201b`]',"'",s)
    s=re.sub(r'[^\w\s\-\'&]',' ',s,flags=re.UNICODE)
    return ' '.join(s.split())

def get(url):
    r=requests.get(url,timeout=300); r.raise_for_status(); return r.content

def pick(headers,names):
    low={str(h).strip().casefold():h for h in headers}
    for n in names:
        if n.casefold() in low:return low[n.casefold()]
    return None

def f21_records(raw):
    wb=load_workbook(io.BytesIO(raw),read_only=True,data_only=True)
    ws=wb['Data']; rows=ws.iter_rows(values_only=True); header=[str(x).strip() if x is not None else '' for x in next(rows)]
    req=['Location','City_Name','City_Code','ISO3_Code','2025']; ix={k:header.index(k) for k in req}
    lat=pick(header,['Latitude','lat','LAT']); lon=pick(header,['Longitude','lon','LON'])
    out=[]
    for idx,row in enumerate(rows,start=1):
        pop=row[ix['2025']]
        if pop not in (None,''): continue
        city=str(row[ix['City_Name']] or '').strip(); country=str(row[ix['Location']] or '').strip()
        if not city or not country: continue
        out.append({'country':country,'city':city,'wup_city_code':str(row[ix['City_Code']]).strip(),'iso3':str(row[ix['ISO3_Code']] or '').strip(),'source_row_index':idx,'lat':row[header.index(lat)] if lat else None,'lon':row[header.index(lon)] if lon else None})
    if len(out)!=EXPECTED: raise SystemExit(f'f21-extension-count:{len(out)}:expected:{EXPECTED}')
    return out

def jrc_rows(raw):
    z=zipfile.ZipFile(io.BytesIO(raw)); names=[n for n in z.namelist() if n.lower().endswith(('.xlsx','.csv'))]
    if not names: raise SystemExit('jrc-statistics-no-machine-readable-table')
    # Prefer the documented multitemporal attributes XLSX.
    names.sort(key=lambda n: (0 if 'MT_GLOBE' in n and n.lower().endswith('.xlsx') else 1, len(n)))
    with z.open(names[0]) as f: data=f.read()
    if names[0].lower().endswith('.csv'):
        return list(csv.DictReader(io.StringIO(data.decode('utf-8-sig'))))
    wb=load_workbook(io.BytesIO(data),read_only=True,data_only=True)
    ws=wb.active; it=ws.iter_rows(values_only=True); header=[str(x).strip() if x is not None else '' for x in next(it)]
    return [dict(zip(header,row)) for row in it]

def enrich(f21,jrc):
    # JRC rows: only 2025 epoch, finite positive population.
    jcity=pick(jrc[0].keys(),['UCname','city','name']) if jrc else None
    jcountry=pick(jrc[0].keys(),['UNLocName','country']) if jrc else None
    jyear=pick(jrc[0].keys(),['Year','year']) if jrc else None
    jpop=pick(jrc[0].keys(),['POP','Population','population']) if jrc else None
    jlat=pick(jrc[0].keys(),['Lat','lat','Latitude']) if jrc else None
    jlon=pick(jrc[0].keys(),['Lon','lon','Longitude']) if jrc else None
    if not all([jcity,jcountry,jyear,jpop]): raise SystemExit(f'jrc-schema-mismatch:city={jcity}:country={jcountry}:year={jyear}:pop={jpop}')
    idx={}
    for r in jrc:
        try: year=int(float(r.get(jyear)))
        except: continue
        if year!=2025: continue
        try: pop=float(r.get(jpop))
        except: continue
        if not math.isfinite(pop) or pop<=0 or pop>=50000: continue
        key=(norm(r.get(jcountry)),norm(r.get(jcity)))
        idx.setdefault(key,[]).append(r)
    accepted=[]; ambiguous=[]; unmatched=[]
    for src in f21:
        key=(norm(src['country']),norm(src['city'])); cand=idx.get(key,[])
        if len(cand)==1:
            r=cand[0]
            accepted.append({**src,'population':int(round(float(r[jpop]))),'population_source':'JRC GHS-WUP-MTUC R2025A','population_source_year':2025,'jrc_city_name':r[jcity],'jrc_country':r[jcountry],'jrc_lat':r.get(jlat),'jrc_lon':r.get(jlon),'jrc_id':r.get('ID_UC_G0') or r.get('ID_MTUC')})
        elif len(cand)==0: unmatched.append(src)
        else: ambiguous.append({'source':src,'candidates':len(cand)})
    report={'expected':EXPECTED,'accepted':len(accepted),'unmatched':len(unmatched),'ambiguous':len(ambiguous),'status':'pass' if len(accepted)==EXPECTED and not unmatched and not ambiguous else 'fail'}
    return accepted,unmatched,ambiguous,report

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--out',required=True); ap.add_argument('--report',required=True); a=ap.parse_args()
    f21=get(F21_URL); jrc=get(JRC_URL)
    f21r=f21_records(f21); jr=jrc_rows(jrc); accepted,unmatched,ambiguous,report=enrich(f21r,jr)
    report.update({'f21_sha256':hashlib.sha256(f21).hexdigest(),'jrc_sha256':hashlib.sha256(jrc).hexdigest(),'f21_url':F21_URL,'jrc_url':JRC_URL})
    Path(a.report).write_text(json.dumps(report,indent=2)+'\n')
    if report['status']!='pass':
        Path(a.out).unlink(missing_ok=True)
        Path(a.report).write_text(json.dumps({**report,'unmatched_rows':unmatched[:100],'ambiguous_rows':ambiguous[:100]},indent=2)+'\n')
        raise SystemExit('4690-population-enrichment-failed-closed')
    # Stable order is the original F21 source order; never reorder by name.
    accepted.sort(key=lambda r:r['source_row_index'])
    Path(a.out).write_text(json.dumps(accepted,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report,indent=2))

if __name__=='__main__':main()
