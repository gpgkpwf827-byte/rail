// Railway Manager candidate network graph v0.3.
// These are schematic consecutive-station relationships, NOT physical track edges.
// Some actual intermediate stations, junctions and alternative paths are omitted.
// Never use these candidate links for mileage, train routing, purchase rights or fares.
import {stations, corridors} from './network.js';

export const graphVersion = 'candidate-0.3';
export const candidateLinks = Object.freeze([
  ['ipswich','needham','great-eastern-north'],
  ['needham','stowmarket','great-eastern-north'],
  ['stowmarket','diss','great-eastern-north'],
  ['diss','norwich','great-eastern-north'],
  ['ipswich','manningtree','great-eastern-south'],
  ['manningtree','colchester','great-eastern-south'],
  ['ipswich','derbyroad','east-suffolk'],
  ['derbyroad','woodbridge','east-suffolk'],
  ['woodbridge','melton','east-suffolk'],
  ['melton','wickham','east-suffolk'],
  ['wickham','saxmundham','east-suffolk']
].map(([from,to,corridorId]) => ({id:[from,to].sort().join('--'),from,to,corridorId,verification:'unverified',geometry:null,distanceMiles:null})));

export function validateCandidateNetwork(stationList=stations, linkList=candidateLinks, corridorList=corridors){
  const errors=[];
  const ids=new Set();
  for(const station of stationList){
    if(ids.has(station.id)) errors.push(`Duplicate station ID: ${station.id}`);
    ids.add(station.id);
    if(!Array.isArray(station.coordinates)||station.coordinates.length!==2||station.coordinates.some(v=>!Number.isFinite(v))) errors.push(`Invalid station coordinates: ${station.id}`);
  }
  const corridorById=new Map(corridorList.map(c=>[c.id,c]));
  const seen=new Set();
  for(const link of linkList){
    if(!ids.has(link.from)||!ids.has(link.to)) errors.push(`Missing endpoint: ${link.id}`);
    if(link.from===link.to) errors.push(`Self link: ${link.id}`);
    if(seen.has(link.id)) errors.push(`Duplicate link: ${link.id}`);
    seen.add(link.id);
    const c=corridorById.get(link.corridorId);
    if(!c) errors.push(`Unknown corridor: ${link.id}`);
    else if(!c.stationIds.includes(link.from)||!c.stationIds.includes(link.to)) errors.push(`Link outside corridor: ${link.id}`);
  }
  for(const corridor of corridorList){
    for(const stationId of corridor.stationIds) if(!ids.has(stationId)) errors.push(`Unknown corridor station: ${stationId}`);
    for(let i=1;i<corridor.stationIds.length;i++){
      const pair=[corridor.stationIds[i-1],corridor.stationIds[i]].sort().join('--');
      if(!linkList.some(l=>l.id===pair&&l.corridorId===corridor.id)) errors.push(`Missing adjacent pair: ${corridor.id} ${pair}`);
    }
  }
  return {valid:errors.length===0,errors,stationCount:stationList.length,linkCount:linkList.length,corridorCount:corridorList.length};
}

export function getCandidateNeighbours(stationId,linkList=candidateLinks){
  return linkList.filter(link=>link.from===stationId||link.to===stationId)
    .map(link=>({stationId:link.from===stationId?link.to:link.from,corridorId:link.corridorId}));
}
