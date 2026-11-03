#!/usr/bin/env python3
"""Convert archived Network Rail VectorLinks shapefile into static GeoJSON.
Requires: pyshp, pyproj. Reproducible GitHub Actions or local Python workflow.
Never treat shape endpoints as verified operational junctions.
"""
import argparse, json, math, pathlib, urllib.request, datetime, hashlib, collections
import shapefile
from pyproj import Transformer

SOURCE = "https://raw.githubusercontent.com/openraildata/network-rail-gis/main/network-model/VectorLinks/"
FILES = ("NetworkLinks.shp", "NetworkLinks.shx", "NetworkLinks.dbf", "NetworkLinks.prj", "NetworkLinks.CPG")
# Working geographic window includes Ipswich, Cambridge, Ely, Norwich, Lowestoft, Colchester, Felixstowe.
EAST_BBOX = (-0.40, 51.65, 1.85, 53.00)

def download(root):
    root.mkdir(parents=True,exist_ok=True)
    for name in FILES:
        dest=root/name
        if dest.exists() and dest.stat().st_size: continue
        print('Downloading',name, flush=True)
        with urllib.request.urlopen(urllib.request.Request(SOURCE+name,headers={'User-Agent':'RailwayManagerResearch/0.4'}),timeout=120) as stream, dest.open('wb') as f:
            import shutil
            shutil.copyfileobj(stream,f)

def convert(root, output, report, scope):
    to_wgs84=Transformer.from_crs(27700,4326,always_xy=True)
    to_bng=Transformer.from_crs(4326,27700,always_xy=True)
    bbox=EAST_BBOX if scope=='east' else (-9.0,49.5,2.7,59.5)
    corners=[to_bng.transform(x,y) for x in (bbox[0],bbox[2]) for y in (bbox[1],bbox[3])]
    bxmin=min(x for x,y in corners); bxmax=max(x for x,y in corners)
    bymin=min(y for x,y in corners); bymax=max(y for x,y in corners)
    # Wider BNG approximation is only for initial candidate; WGS84 checks follow.
    selected=[]; source_count=0; invalid=0; seen_ids=set(); source_fields=[]
    reader=shapefile.Reader(str(root/'NetworkLinks.shp'))
    fields=[f[0] for f in reader.fields[1:]]; source_fields=fields
    def convert_ring(points):
        coords=[]
        for x,y in points:
            lon,lat=to_wgs84.transform(x,y)
            if not (math.isfinite(lon) and math.isfinite(lat)): return None
            coords.append([round(lon,6),round(lat,6)])
        return coords if len(coords)>1 else None
    for shape_record in reader.iterShapeRecords():
        source_count+=1; shape=shape_record.shape
        if not shape.points or shape.shapeType not in (3,13,23): invalid+=1;continue
        xmin,ymin,xmax,ymax=shape.bbox
        if xmax<bxmin or xmin>bxmax or ymax<bymin or ymin>bymax: continue
        attrs=dict(zip(fields,shape_record.record))
        parts=list(shape.parts)+[len(shape.points)]; lines=[]
        for i in range(len(parts)-1):
            coords=convert_ring(shape.points[parts[i]:parts[i+1]])
            if coords and any(bbox[0]<=x<=bbox[2] and bbox[1]<=y<=bbox[3] for x,y in coords):lines.append(coords)
        if not lines:continue
        # Keep ELR/TRID where available, without assuming exact shapefile field spelling.
        props={k:str(v).strip()[:100] for k,v in attrs.items() if ('ELR' in k.upper() or 'TRID' in k.upper()) and v is not None}
        props['source']='Network Rail INM archived VectorLinks'
        geom={'type':'LineString','coordinates':lines[0]} if len(lines)==1 else {'type':'MultiLineString','coordinates':lines}
        selected.append({'type':'Feature','properties':props,'geometry':geom})
    reader.close();output.parent.mkdir(parents=True,exist_ok=True)
    result={'type':'FeatureCollection','features':selected}
    output.write_text(json.dumps(result,separators=(',',':'),ensure_ascii=False))
    status={'version':'0.4','scope':scope,'source':SOURCE,'source_is_archived':True,'crs_input':'EPSG:27700','crs_output':'EPSG:4326','bbox':bbox,'original_record_count':source_count,'exported_feature_count':len(selected),'invalid_geometry_record_count':invalid,'fields_available':source_fields,'output_bytes':output.stat().st_size,'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),'interpretation':'VISUAL GEOMETRY ONLY. Not validated topology, current track inventory, route distance or purchasable sections.'}
    report.write_text(json.dumps(status,indent=2))
    assert len(selected)>0,'Empty selection — investigate file conversion and bounds'
    print('Generated',output,'features',len(selected),'bytes',output.stat().st_size)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--scope',choices=('east','national'),default='east');p.add_argument('--workdir',default='.rail-source');p.add_argument('--output');p.add_argument('--report');args=p.parse_args()
    out=pathlib.Path(args.output or f'data/derived/network-rail-{args.scope}.geojson')
    report=pathlib.Path(args.report or f'data/derived/network-rail-{args.scope}-metadata.json')
    download(pathlib.Path(args.workdir));convert(pathlib.Path(args.workdir),out,report,args.scope)
