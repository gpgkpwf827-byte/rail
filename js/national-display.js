// Railway Manager v0.7 — national display-only catalogue. No operational routing.
// Starter stations retain their existing stable IDs, metadata and hub ownership.
const starterATCO = {'ipswich':'9100IPSWICH','needham':'9100NEEDHAM','stowmarket':'9100STWMRKT','diss':'9100DISS','norwich':'9100NRCH','manningtree':'9100MANNGTR','colchester':'9100CLCHSTR','derbyroad':'9100DERBYRD','woodbridge':'9100WODBDGE','melton':'9100MELTON','saxmundham':'9100SXMNDHM','wickham':'9100WCKHMMR'};
const featuredNames = new Set(['Ipswich','Norwich','London Liverpool Street','London Kings Cross','London Paddington','London Victoria','London Euston','London Waterloo','London Bridge','Birmingham New Street','Manchester Piccadilly','Manchester Victoria','Leeds','York','Sheffield','Liverpool Lime Street','Glasgow Central','Glasgow Queen Street','Edinburgh','Cardiff Central','Bristol Temple Meads','Newcastle','Nottingham','Derby','Cambridge','Oxford','Reading','Exeter St Davids','Plymouth','Penzance','Aberdeen','Inverness','Carlisle','Crewe']);
export function mergeNationalStationCatalogue(starterStations, collection){
 if(!collection || collection.type!=='FeatureCollection' || !Array.isArray(collection.features))throw new Error('Invalid station GeoJSON');
 const starters=starterStations.map(st=>({...st}));
 const byCode=new Map();
 const used=new Set();
 let imported=0;
 for(const f of collection.features){
   const p=f?.properties||{}, c=f?.geometry?.coordinates;
   if(f?.geometry?.type!=='Point'||!Array.isArray(c)||c.length!==2||!c.every(Number.isFinite)||!p.atcoCode||!p.name)continue;
   const sourceCodes=Array.isArray(p.sourceAtcoCodes)?p.sourceAtcoCodes:[p.atcoCode];
   const name=String(p.name).trim();
   const record={id:`naptan:${p.atcoCode}`,name,coordinates:[...c],hub:false,imported:true,atcoCode:String(p.atcoCode),sourceAtcoCodes:sourceCodes,featured:featuredNames.has(name),distanceMetres:Number.isFinite(p.nearestVisualLineDistanceM)?p.nearestVisualLineDistanceM:0,matchStatus:p.needsReview?'caution':'candidate'};
   for(const code of sourceCodes)byCode.set(code,record);
   used.add(record.id);
   imported++;
 }
 const selected=new Set();
 const result=[];
 for(const starter of starters){
   const match=byCode.get(starterATCO[starter.id]||starter.atcoCode)||[...byCode.values()].find(r=>r.name.toLowerCase()===starter.name.toLowerCase());
   if(match){ selected.add(match.id);result.push({...starter,coordinates:[...match.coordinates],featured:match.featured||Boolean(starter.hub)}); }
   else result.push({...starter,featured:Boolean(starter.hub)});
 }
 const seen=new Set(selected);
 for(const f of collection.features){
   const code=f?.properties?.atcoCode;
   const record=byCode.get(code);
   if(record&&!seen.has(record.id)){seen.add(record.id);result.push(record);}
 }
 return {stations:result,imported:result.length-starters.length,preservedStarter:starters.length};
}
export function toStationGeoJSON(stations){
 return {type:'FeatureCollection',features:stations.map(st=>({type:'Feature',properties:{id:st.id,name:st.name,hub:Boolean(st.hub),featured:Boolean(st.featured)},geometry:{type:'Point',coordinates:st.coordinates}}))};
}
