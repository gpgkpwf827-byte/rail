import * as maplibregl from 'https://unpkg.com/maplibre-gl@6.16.0/dist/maplibre-gl.mjs';
import {stations, stationsGeoJSON} from '../data/network.js';
import {getCandidateNeighbours, validateCandidateNetwork} from '../data/graph.js';

const $ = selector => document.querySelector(selector);
const all = selector => [...document.querySelectorAll(selector)];
const start = [1.1447,52.0506];
let map;
let selectedLayer = 'coverage';
let currentTab = 'map';

function switchTab(tab){
  currentTab = tab;
  all('.screen').forEach(el=>el.classList.toggle('is-active',el.id===`screen-${tab}`));
  all('.tab').forEach(el=>{const active=el.dataset.tab===tab;el.classList.toggle('is-active',active);if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
  closeSheet();
  if(tab==='map' && map) requestAnimationFrame(()=>map.resize());
}
all('.tab').forEach(tab=>tab.addEventListener('click',()=>switchTab(tab.dataset.tab)));

function escapeHTML(str){return String(str).replace(/[&<>"']/g, char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
function openSheet(type,title,html){
  $('#sheet-type').textContent=type;
  $('#sheet-title').textContent=title;
  $('#sheet-content').innerHTML=html;
  $('#detail-sheet').hidden=false;
  $('#sheet-backdrop').hidden=false;
  $('#close-sheet').focus({preventScroll:true});
}
function closeSheet(){ $('#detail-sheet').hidden=true;$('#sheet-backdrop').hidden=true; }
$('#close-sheet').addEventListener('click',closeSheet);
$('#sheet-backdrop').addEventListener('click',closeSheet);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSheet();});
function openStation(station){
  const hub=Boolean(station.hub);
  const neighbours=getCandidateNeighbours(station.id);
  const nearbyNames=neighbours.map(n=>stations.find(s=>s.id===n.stationId)?.name||n.stationId);
  openSheet(hub?'OWNED HUB':'RAILWAY STATION',station.name,
   `<p class="sheet-caption">${hub?'Your starting operational hub. This is the only owned asset shown.':'A station in our starter geography dataset.'} Station points are provisional; the visible railway lines use OpenStreetMap-derived vector tiles.</p>`+
   `<div class="sheet-row"><span>Current status</span><strong>${hub?'Owned hub':'Ordinary station'}</strong></div>`+
   (hub?'<div class="sheet-row"><span>Maintenance bays</span><strong>1</strong></div><div class="sheet-row"><span>Based trains</span><strong>0</strong></div>':'')+
   '<div class="sheet-row"><span>Services</span><strong>None</strong></div>'+
   `<div class="sheet-row"><span>Candidate network links</span><strong>${neighbours.length}</strong></div>`+
   `<p class="sheet-caption"><strong>Schematic neighbours (unverified):</strong> ${nearbyNames.length?nearbyNames.map(escapeHTML).join(' · '):'None'}. These are planning connections, not validated adjacent track sections.</p>`+
   (hub?'<button type="button" class="sheet-action" id="show-hub">View in Hubs</button>':'')
  );
  $('#show-hub')?.addEventListener('click',()=>switchTab('hubs'));
}
function openRailAlignment(properties={}){
  const classification=escapeHTML(properties.class||'rail');
  openSheet('MAPPED RAILWAY','Existing rail alignment',
    '<p class="sheet-caption">This track is drawn from OpenStreetMap-derived map tiles, rather than the old hand-drawn test lines. It is visual geography only: it is <strong>not</strong> a purchasable access section or a validated connected routing graph.</p>'+
    `<div class="sheet-row"><span>Mapped type</span><strong>${classification}</strong></div>`+
    '<div class="sheet-row"><span>Access status</span><strong>Not purchased</strong></div>'+
    '<p>Section boundaries, access prices and operational connections will be designed and verified separately.</p>'+
    '<button type="button" class="sheet-action" disabled aria-disabled="true">Purchasing not implemented</button>'
  );
}
$('#ipswich-hub-card').addEventListener('click',()=>{switchTab('map'); const st=stations.find(s=>s.id==='ipswich');map?.flyTo({center:st.coordinates,zoom:11});openStation(st);});
$('#info-button').addEventListener('click',()=>openSheet('ABOUT','UI prototype v0.4','<p>This is an interface prototype only. The routes, purchases, passenger demand, financial data, fleet and simulation have not been implemented.</p><p>Visible rail alignments use OpenStreetMap-derived vector tiles. A separate schematic candidate network is now defined and validated structurally, but is NOT a real routing graph. Station positions remain provisional. Data layer selections do not show demand coverage or opportunity yet.</p>'));
$('#reset-view').addEventListener('click',()=>map?.flyTo({center:start,zoom:12.5,duration:700}));

function selectLayer(layer){
  selectedLayer=layer;
  all('.layer-button').forEach(button=>button.classList.toggle('is-selected',button.dataset.layer===layer));
  // Both currently use the same neutral unowned rail style, as required by the design.
  // Actual coloured overlays will depend on the approved forecast calculations.
  $('.legend').setAttribute('aria-label',`${layer} layer selected. No valid overlay data exists yet.`);
}
all('.layer-button').forEach(button=>button.addEventListener('click',()=>selectLayer(button.dataset.layer)));
const search=$('#station-search'), results=$('#search-results');
search.addEventListener('input',()=>{
  const q=search.value.trim().toLowerCase();
  if(!q){results.hidden=true;results.replaceChildren();return;}
  const matches=stations.filter(s=>s.name.toLowerCase().includes(q)).slice(0,8);
  results.replaceChildren();
  matches.forEach(st=>{const button=document.createElement('button');button.type='button';button.className='search-result';button.textContent=st.name;button.addEventListener('click',()=>goToStation(st));results.append(button);});
  if(!matches.length){const p=document.createElement('div');p.className='search-result';p.textContent='No matching station in the example dataset';results.append(p);}
  results.hidden=false;
});
search.addEventListener('keydown',event=>{if(event.key==='Enter'){const match=stations.find(s=>s.name.toLowerCase().includes(search.value.trim().toLowerCase()));if(match)goToStation(match);}});
function goToStation(st){switchTab('map');search.value=st.name;results.hidden=true;map?.flyTo({center:st.coordinates,zoom:12,duration:750});openStation(st);search.blur();}

async function loadNetworkRailOverlay(){
  // Only an explicit processed file enables this layer. Missing file leaves v0.3 map unchanged.
  try {
    const response=await fetch('./data/derived/network-rail-east.geojson',{cache:'no-store'});
    if(!response.ok) return;
    const data=await response.json();
    if(data.type!=='FeatureCollection'||!Array.isArray(data.features)||data.features.length===0)return;
    map.addSource('network-rail-archive',{type:'geojson',data});
    map.addLayer({id:'network-rail-geometry',type:'line',source:'network-rail-archive',paint:{'line-color':'#586b76','line-width':['interpolate',['linear'],['zoom'],4,0.4,8,0.8,12,1.8,16,2.8],'line-opacity':0.9}});
    // Use archived rail geometry in place of the background-tiles overlay, preserving station markers above it.
    for(const id of ['mapped-rail-halo','mapped-rail-lines','mapped-rail-hit'])if(map.getLayer(id))map.setLayoutProperty(id,'visibility','none');
    map.on('click','network-rail-geometry',e=>openSheet('ARCHIVED NETWORK RAIL TRACK','Mapped track geometry',
      '<p class="sheet-caption">From Network Rail archived VectorLinks. This is a historical physical track centre line, not a validated passenger route, connected game section or ownership right.</p>'+
      '<div class="sheet-row"><span>Geography</span><strong>Historical / unverified</strong></div>'+
      '<div class="sheet-row"><span>Purchase status</span><strong>Not available</strong></div>'));
    const note=document.querySelector('.map-note');
    if(note){note.querySelector('strong').textContent='Network Rail archived geography';note.querySelector('span').textContent=`${data.features.length.toLocaleString()} track features · not validated for routing`;}
  }catch(e){console.info('Archived railway extract not installed; using existing map tiles',e);}
}
const graphCheck=validateCandidateNetwork();
if(!graphCheck.valid) console.error('Candidate graph validation errors:',graphCheck.errors);
try{
  map=new maplibregl.Map({container:'map',style:'https://tiles.openfreemap.org/styles/positron',center:start,zoom:12.5,maxZoom:17,minZoom:4,attributionControl:true});
  map.dragRotate.disable();map.touchZoomRotate.disableRotation();
  map.on('load',()=>{
    // Track geometry uses the existing OpenFreeMap vector-tile source; no hand-drawn polylines are rendered.
    map.addSource('example-stations',{type:'geojson',data:stationsGeoJSON});
    // OpenMapTiles transportation features identify mapped heavy railway with class='rail'.
    // Infer source from the active style rather than assuming an OpenFreeMap source identifier.
    const railBase=map.getStyle().layers.find(layer=>layer['source-layer']==='transportation' && layer.source);
    if(railBase){
      const railSource=railBase.source;
      const railFilter=['all',['==',['geometry-type'],'LineString'],['==',['get','class'],'rail']];
      map.addLayer({id:'mapped-rail-halo',type:'line',source:railSource,'source-layer':'transportation',filter:railFilter,minzoom:10,paint:{'line-color':'#ffffff','line-width':['interpolate',['linear'],['zoom'],10,3.5,14,7,17,9],'line-opacity':0.95}});
      map.addLayer({id:'mapped-rail-lines',type:'line',source:railSource,'source-layer':'transportation',filter:railFilter,minzoom:10,paint:{'line-color':'#75848a','line-width':['interpolate',['linear'],['zoom'],10,1.6,14,2.9,17,4.2],'line-opacity':0.95}});
      // A wide nearly transparent hit area makes narrow rail geometry easier to tap on an iPhone.
      map.addLayer({id:'mapped-rail-hit',type:'line',source:railSource,'source-layer':'transportation',filter:railFilter,minzoom:10,paint:{'line-color':'#75848a','line-width':22,'line-opacity':0.01}});
      map.on('click','mapped-rail-hit',event=>{
        const [x,y]=[event.point.x,event.point.y];
        const nearStation=map.queryRenderedFeatures([[x-15,y-15],[x+15,y+15]],{layers:['hub-circle','station-dots']});
        if(!nearStation.length) openRailAlignment(event.features?.[0]?.properties);
      });
      map.on('mouseenter','mapped-rail-hit',()=>map.getCanvas().style.cursor='pointer');
      map.on('mouseleave','mapped-rail-hit',()=>map.getCanvas().style.cursor='');
    } else {
      console.warn('Active map style does not expose a transportation vector layer. Railway overlay unavailable.');
      document.querySelector('.map-note span').textContent='Railway vector layer unavailable · check map style';
    }
    map.addLayer({id:'station-dots',type:'circle',source:'example-stations',filter:['!=',['get','hub'],true],paint:{'circle-radius':['interpolate',['linear'],['zoom'],7,3,11,5,14,7],'circle-color':'#ffffff','circle-stroke-color':'#6c7e78','circle-stroke-width':2}});
    map.addLayer({id:'station-labels',type:'symbol',source:'example-stations',minzoom:9,layout:{'text-field':['get','name'],'text-size':11,'text-offset':[0,1.25],'text-anchor':'top','text-allow-overlap':false},paint:{'text-color':'#2b4840','text-halo-color':'#fff','text-halo-width':1.8}});
    map.addLayer({id:'hub-circle',type:'circle',source:'example-stations',filter:['==',['get','hub'],true],paint:{'circle-radius':11,'circle-color':'#08745e','circle-stroke-width':3,'circle-stroke-color':'#fff'}});
    map.addLayer({id:'hub-symbol',type:'symbol',source:'example-stations',filter:['==',['get','hub'],true],layout:{'text-field':'◆','text-size':13,'text-allow-overlap':true},paint:{'text-color':'#ffffff'}});
    map.on('click','hub-circle',e=>{const st=stations.find(s=>s.id===e.features?.[0]?.properties?.id);if(st)openStation(st);});
    map.on('click','station-dots',e=>{const st=stations.find(s=>s.id===e.features?.[0]?.properties?.id);if(st)openStation(st);});
    ['hub-circle','station-dots'].forEach(id=>{map.on('mouseenter',id,()=>map.getCanvas().style.cursor='pointer');map.on('mouseleave',id,()=>map.getCanvas().style.cursor='');});
    loadNetworkRailOverlay().then(()=>{for(const id of ['station-dots','station-labels','hub-circle','hub-symbol'])if(map.getLayer(id))map.moveLayer(id);});
  });
  map.on('error',error=>{console.warn('Map resource error',error.error);});
}catch(error){console.error(error);$('#map').innerHTML='<p style="padding:30px;">Unable to start the interactive map. Check your internet connection and that your browser supports WebGL.</p>';}
