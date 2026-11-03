import tempfile
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
from import_stations import import_csv

with tempfile.TemporaryDirectory() as tmp:
    src = Path(tmp) / 'stops.csv'
    src.write_text('ATCOCode,CommonName,Longitude,Latitude,StopType,LocalityName,Status\n'
                   '1,Ipswich,1.145,52.051,RLY,Ipswich,active\n'
                   '2,Ipswich station entrance,1.145,52.051,RSE,Ipswich,active\n'
                   '3,Ipswich platform 1,1.145,52.051,RPL,Ipswich,active\n'
                   '4,Outside East,-2.5,53.4,RLY,Elsewhere,active\n'
                   '5,Bad rail,not-num,52,RLY,Test,active\n'
                   '1,Ipswich,1.145,52.051,RLY,Ipswich,active\n'
                   '6,Deleted,1.145,52.051,RLY,Ipswich,deleted\n', encoding='utf-8')
    rows, counts, types, statuses, dupes, duplicates = import_csv(src, 'east')
    assert len(rows) == 1, (rows, counts)
    assert rows[0]['name'] == 'Ipswich'
    assert counts['total_rows'] == 7
    assert counts['excluded_outside_east'] == 1
    assert counts['excluded_duplicate_ATCOCode'] == 1
    assert counts['excluded_inactive'] == 1
    assert counts['excluded_missing_invalid_coordinates'] == 1
    rows, *_ = import_csv(src, 'national')
    assert len(rows) == 2
    print('NaPTAN importer synthetic tests passed')
