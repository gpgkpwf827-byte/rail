// Railway Manager v0.5c — visual station catalogue merger (NO operational routing).
// Preserve starter IDs, hub status and snapped marker locations. Original NaPTAN records remain unchanged.
export function mergeStationCatalogues(starterStations, collection) {
  if (!collection || collection.type !== 'FeatureCollection' || !Array.isArray(collection.features)) throw new Error('Invalid station GeoJSON');
  const stations = starterStations.map(s => ({...s}));
  const usedIds = new Set(stations.map(s => s.id));
  const starterIds = new Set(stations.map(s => s.id));
  const seenNames = new Set();
  let added = 0, skippedStarter = 0, skippedDuplicate = 0, skippedInvalid = 0;
  // Data-driven de-duplication for matching name+locality, not a universal station identity rule.
  // Keep first entry (source already ordered by ATCO code); retain all records in raw GeoJSON.
  for (const feature of collection.features) {
    const p = feature?.properties || {};
    const c = feature?.geometry?.coordinates;
    if (feature?.geometry?.type !== 'Point' || !Array.isArray(c) || c.length !== 2 || !c.every(Number.isFinite) || Math.abs(c[0]) > 180 || Math.abs(c[1]) > 90 || !p.atcoCode || !p.name) { skippedInvalid++; continue; }
    if (p.starterUiId && starterIds.has(p.starterUiId)) { skippedStarter++; continue; }
    if (p.status !== 'active' || p.stopType !== 'RLY') { skippedInvalid++; continue; }
    const name = String(p.name).replace(/ Rail Station$/i, '').trim();
    const duplicateKey = `${name.toLocaleLowerCase('en-GB')}|${String(p.locality || '').trim().toLocaleLowerCase('en-GB')}`;
    if (seenNames.has(duplicateKey)) { skippedDuplicate++; continue; }
    const id = `naptan:${p.atcoCode}`;
    if (usedIds.has(id)) { skippedDuplicate++; continue; }
    seenNames.add(duplicateKey);usedIds.add(id);
    stations.push({id, name, coordinates:[...c], hub:false, imported:true, atcoCode:String(p.atcoCode),
      matchStatus:p.displayMatchStatus === 'caution' ? 'caution' : 'candidate',
      distanceMetres:Number.isFinite(p.displayDistanceMetres) ? p.displayDistanceMetres : 0});
    added++;
  }
  return {stations,added,skippedStarter,skippedDuplicate,skippedInvalid};
}
export function toStationGeoJSON(stations) {
  return {type:'FeatureCollection',features:stations.map(st => ({type:'Feature',properties:{id:st.id,name:st.name,hub:Boolean(st.hub)},geometry:{type:'Point',coordinates:st.coordinates}}))};
}
