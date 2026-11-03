// UI-only example geography. Coordinates and polylines are illustrative and not authoritative rail alignments.
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
export const corridors = [
  {id:'great-eastern-north',name:'Great Eastern Main Line — north',stationIds:['ipswich','needham','stowmarket','diss','norwich'], coordinates:[[1.1447,52.0506],[1.123,52.087],[1.101,52.116],[1.055,52.1535],[1.015,52.169],[0.9525,52.1893],[0.990,52.243],[1.040,52.300],[1.1233,52.3734],[1.187,52.455],[1.252,52.531],[1.3068,52.6271]]},
  {id:'great-eastern-south',name:'Great Eastern Main Line — south',stationIds:['ipswich','manningtree','colchester'],coordinates:[[1.1447,52.0506],[1.115,52.023],[1.078,51.985],[1.0462,51.9490],[0.996,51.927],[0.949,51.911],[0.9053,51.9007]]},
  {id:'east-suffolk',name:'East Suffolk Line',stationIds:['ipswich','derbyroad','woodbridge','melton','wickham','saxmundham'],coordinates:[[1.1447,52.0506],[1.1821,52.0503],[1.222,52.054],[1.270,52.069],[1.3174,52.0900],[1.3383,52.1040],[1.373,52.126],[1.3999,52.1510],[1.448,52.189],[1.4867,52.2141]]}
];
export const stationsGeoJSON = {type:'FeatureCollection',features:stations.map(station=>({type:'Feature',properties:{...station},geometry:{type:'Point',coordinates:station.coordinates}}))};
export const corridorsGeoJSON = {type:'FeatureCollection',features:corridors.map(c=>({type:'Feature',properties:{id:c.id,name:c.name,stationIds:c.stationIds.join(', ')},geometry:{type:'LineString',coordinates:c.coordinates}}))};
