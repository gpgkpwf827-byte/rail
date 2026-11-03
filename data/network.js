
// UI-only station catalogue. Markers provisionally snapped to archived Network Rail VectorLinks geometry.
// Stowmarket was first corrected from its old misplaced starter point; all coordinates need station/platform validation.
// These coordinates are VISUAL markers ONLY, not verified platform access, junctions or routing nodes.
// Corridor polylines below are deprecated placeholders and MUST NOT be displayed or used for routing.

export const stations = [
  {id:'ipswich',name:'Ipswich',coordinates:[1.1446044,52.0504728],hub:true},
  {id:'needham',name:'Needham Market',coordinates:[1.0546562,52.1533538]},
  {id:'stowmarket',name:'Stowmarket',coordinates:[1.0001922,52.189787]},
  {id:'diss',name:'Diss',coordinates:[1.1233109,52.3733964]},
  {id:'norwich',name:'Norwich',coordinates:[1.306879,52.626846]},
  {id:'manningtree',name:'Manningtree',coordinates:[1.0461722,51.9491092]},
  {id:'colchester',name:'Colchester',coordinates:[0.8934459,51.9005417]},
  {id:'derbyroad',name:'Derby Road',coordinates:[1.1826804,52.0505073]},
  {id:'woodbridge',name:'Woodbridge',coordinates:[1.3173816,52.090015]},
  {id:'melton',name:'Melton',coordinates:[1.3380838,52.1042775]},
  {id:'saxmundham',name:'Saxmundham',coordinates:[1.4887624,52.2134879]},
  {id:'wickham',name:'Wickham Market',coordinates:[1.3991774,52.1513768]}
];

// Corridor membership is design metadata, not purchase boundaries or definitive alignments.
export const corridors = [
  {
    id:'great-eastern-north',
    name:'Great Eastern Main Line — north',
    stationIds:['ipswich','needham','stowmarket','diss','norwich']
  },
  {
    id:'great-eastern-south',
    name:'Great Eastern Main Line — south',
    stationIds:['ipswich','manningtree','colchester']
  },
  {
    id:'east-suffolk',
    name:'East Suffolk Line',
    stationIds:['ipswich','derbyroad','woodbridge','melton','wickham','saxmundham']
  }
];

export const stationsGeoJSON = {
  type:'FeatureCollection',
  features:stations.map(station=>({
    type:'Feature',
    properties:{...station},
    geometry:{
      type:'Point',
      coordinates:station.coordinates
    }
  }))
};
