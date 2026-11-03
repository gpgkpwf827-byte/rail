// UI-only station catalogue. Coordinates are provisional and must be verified before operational use.
// Corridor polylines below are deprecated placeholders and MUST NOT be displayed or used for routing.
export const stations = [
  {id:'ipswich',name:'Ipswich',coordinates:[1.1447,52.0506],hub:true},
  {id:'needham',name:'Needham Market',coordinates:[1.0550,52.1535]},
  {id:'stowmarket',name:'Stowmarket',coordinates:[0.9525,52.1893]},
  {id:'diss',name:'Diss',coordinates:[1.1233,52.3734]},
  {id:'norwich',name:'Norwich',coordinates:[1.3068,52.6271]},
  {id:'manningtree',name:'Manningtree',coordinates:[1.0462,51.9490]},
  {id:'colchester',name:'Colchester',coordinates:[0.9053,51.9007]},
  {id:'derbyroad',name:'Derby Road',coordinates:[1.1821,52.0503]},
  {id:'woodbridge',name:'Woodbridge',coordinates:[1.3174,52.0900]},
  {id:'melton',name:'Melton',coordinates:[1.3383,52.1040]},
  {id:'saxmundham',name:'Saxmundham',coordinates:[1.4867,52.2141]},
  {id:'wickham',name:'Wickham Market',coordinates:[1.3999,52.1510]}
];
// Corridor membership is design metadata, not purchase boundaries or definitive alignments.
export const corridors = [
  {id:'great-eastern-north', name:'Great Eastern Main Line — north', stationIds:['ipswich','needham','stowmarket','diss','norwich']},
  {id:'great-eastern-south', name:'Great Eastern Main Line — south', stationIds:['ipswich','manningtree','colchester']},
  {id:'east-suffolk', name:'East Suffolk Line', stationIds:['ipswich','derbyroad','woodbridge','melton','wickham','saxmundham']}
];
export const stationsGeoJSON = {type:'FeatureCollection',features:stations.map(station=>({type:'Feature',properties:{...station},geometry:{type:'Point',coordinates:station.coordinates}}))};
