#!/usr/bin/env python3
"""NaPTAN railway-access-area importer for Railway Manager v0.5a.

Reads national CSV (local file or official DfT API), and exports *candidate*
rail station points. RLY represents a railway access area; it does NOT by
itself validate National Rail service, platform access or physical track links.
Uses Python standard library only, processing CSV incrementally.
"""
import argparse
import collections
import csv
import datetime as dt
import hashlib
import io
import json
import math
from pathlib import Path
import shutil
import urllib.request
import zipfile

API_URL = 'https://naptan.api.dft.gov.uk/v1/access-nodes?dataFormat=csv'
EAST_BBOX = (-0.40, 51.65, 1.85, 53.00)
REQUIRED = {'ATCOCode', 'CommonName', 'Longitude', 'Latitude', 'StopType'}


def fetch(url, destination):
    destination.parent.mkdir(parents=True, exist_ok=True)
    print('Downloading national NaPTAN CSV from DfT API; this may take several minutes.', flush=True)
    request = urllib.request.Request(url, headers={'User-Agent': 'RailwayManagerResearch/0.5a', 'Accept': 'text/csv,application/zip,*/*'})
    with urllib.request.urlopen(request, timeout=360) as response, destination.open('wb') as out:
        shutil.copyfileobj(response, out)
    print(f'Download complete: {destination.stat().st_size:,} bytes', flush=True)


def open_csv(path):
    if zipfile.is_zipfile(path):
        zf = zipfile.ZipFile(path)
        names = [n for n in zf.namelist() if n.lower().endswith('.csv') and not n.endswith('/')]
        if not names:
            zf.close()
            raise ValueError('Input ZIP does not contain a CSV')
        if len(names) > 1:
            zf.close()
            raise ValueError(f'Input ZIP has {len(names)} CSV files; supply the intended one directly')
        data = io.TextIOWrapper(zf.open(names[0]), encoding='utf-8-sig', errors='replace', newline='')
        return data, zf
    return path.open('r', encoding='utf-8-sig', errors='replace', newline=''), None


def import_csv(path, scope):
    counts = collections.Counter()
    stop_types = collections.Counter()
    statuses = collections.Counter()
    duplicate_ids = []
    name_locality = collections.defaultdict(list)
    known_ids = set()
    records = []
    stream, owner = open_csv(path)
    try:
        reader = csv.DictReader(stream)
        if not reader.fieldnames:
            raise ValueError('CSV has no header row')
        reader.fieldnames = [name.strip() if name else '' for name in reader.fieldnames]
        missing = REQUIRED.difference(reader.fieldnames)
        if missing:
            raise ValueError(f'NaPTAN CSV missing required columns: {sorted(missing)}')
        for row in reader:
            counts['total_rows'] += 1
            typ = (row.get('StopType') or '').strip().upper()
            stop_types[typ or '(blank)'] += 1
            if typ != 'RLY':
                continue
            counts['rail_access_area_rows'] += 1
            status = (row.get('Status') or '').strip()
            statuses[status or '(blank)'] += 1
            # Do not silently discard unfamiliar status values. Only clearly
            # deleted/inactive rows are excluded; breakdown is in report.
            if status.upper() in {'DEL', 'DELETED', 'INACTIVE', 'I'}:
                counts['excluded_inactive'] += 1
                continue
            atco = (row.get('ATCOCode') or '').strip()
            name = (row.get('CommonName') or '').strip()
            if not atco or not name:
                counts['excluded_missing_id_or_name'] += 1
                continue
            try:
                lon = float((row.get('Longitude') or '').strip())
                lat = float((row.get('Latitude') or '').strip())
            except (ValueError, TypeError):
                counts['excluded_missing_invalid_coordinates'] += 1
                continue
            if not all(map(math.isfinite, (lon, lat))) or not (-9.5 < lon < 3.5 and 49.0 < lat < 61.0):
                counts['excluded_outside_gb_coordinates'] += 1
                continue
            if scope == 'east' and not (EAST_BBOX[0] <= lon <= EAST_BBOX[2] and EAST_BBOX[1] <= lat <= EAST_BBOX[3]):
                counts['excluded_outside_east'] += 1
                continue
            if atco in known_ids:
                counts['excluded_duplicate_ATCOCode'] += 1
                if len(duplicate_ids) < 30: duplicate_ids.append(atco)
                continue
            known_ids.add(atco)
            locality = (row.get('LocalityName') or '').strip()
            key = (name.casefold(), locality.casefold())
            name_locality[key].append(atco)
            records.append({
                'id': atco, 'name': name, 'lon': round(lon, 7), 'lat': round(lat, 7),
                'locality': locality, 'town': (row.get('Town') or '').strip(),
                'status': status, 'stopType': 'RLY', 'source': 'NaPTAN',
            })
            counts['exported'] += 1
    finally:
        stream.close()
        if owner: owner.close()
    records.sort(key=lambda r: r['id'])
    potential_duplicates = [{'name': k[0], 'locality': k[1], 'ids': v} for k, v in name_locality.items() if len(v) > 1]
    return records, counts, stop_types, statuses, duplicate_ids, potential_duplicates


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', help='Local NaPTAN national CSV or a ZIP containing one CSV')
    parser.add_argument('--scope', choices=('east', 'national'), default='east')
    parser.add_argument('--url', default=API_URL, help='NaPTAN API CSV URL, used if --input omitted')
    parser.add_argument('--workdir', default='.rail-source')
    parser.add_argument('--output', help='Output JSON path')
    parser.add_argument('--report', help='Output validation report path')
    args = parser.parse_args()
    source = Path(args.input) if args.input else Path(args.workdir) / 'naptan-national.csv'
    if not args.input:
        fetch(args.url, source)
    elif not source.is_file():
        parser.error(f'Input file does not exist: {source}')
    rows, counts, types, statuses, duplicate_ids, potential_duplicates = import_csv(source, args.scope)
    output = Path(args.output or f'data/derived/naptan-rail-{args.scope}.json')
    report = Path(args.report or f'data/derived/naptan-rail-{args.scope}-report.json')
    output.parent.mkdir(parents=True, exist_ok=True)
    report.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        'type': 'FeatureCollection',
        'features': [
            {'type': 'Feature', 'properties': {'atcoCode': r['id'], 'name': r['name'], 'locality': r['locality'], 'town': r['town'], 'status': r['status'], 'stopType': 'RLY'}, 'geometry': {'type': 'Point', 'coordinates': [r['lon'], r['lat']]}}
            for r in rows
        ],
    }
    output.write_text(json.dumps(payload, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    report_data = {
        'version': '0.5a', 'created_utc': dt.datetime.now(dt.timezone.utc).isoformat(),
        'scope': args.scope, 'source': str(source) if args.input else args.url,
        'input_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
        'stop_type_counts': dict(types.most_common()), 'rail_status_counts': dict(statuses.most_common()),
        'counts': dict(counts), 'potential_same_name_locality_count': len(potential_duplicates),
        'potential_same_name_locality_examples': potential_duplicates[:30],
        'duplicate_atco_examples': duplicate_ids,
        'output_bytes': output.stat().st_size,
        'output_sha256': hashlib.sha256(output.read_bytes()).hexdigest(),
        'limitations': 'RLY is a rail access area, not necessarily a unique active National Rail station. Neither geometry nor connectivity is track-matched. Do not auto-replace the existing station markers or player hub.'
    }
    report.write_text(json.dumps(report_data, indent=2, ensure_ascii=False), encoding='utf-8')
    if not rows:
        raise SystemExit('No candidate stations exported; inspect source columns and counts')
    print(f'Examined {counts["total_rows"]:,} stops; found {counts["rail_access_area_rows"]:,} RLY rows; exported {len(rows):,} candidate stations for {args.scope}.', flush=True)
    print(f'Output: {output} ({output.stat().st_size:,} bytes); report: {report}', flush=True)


if __name__ == '__main__':
    main()
