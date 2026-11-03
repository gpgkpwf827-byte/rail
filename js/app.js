import * as maplibregl from 'https://unpkg.com/maplibre-gl@6.16.0/dist/maplibre-gl.mjs';
import {stations, corridors, stationsGeoJSON, corridorsGeoJSON} from '../data/network.js';

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
  openSheet(hub?'OWNED HUB':'RAILWAY STATION',station.name,
   `<p class="sheet-caption">${hub?'Your starting operational hub. This is the only owned asset shown.':'An example station in our starter geography dataset.'} Station coordinates and rail geometry need verification against official/open railway datasets.</p>`+
   `<div class="sheet-row"><span>Current status</span><strong>${hub?'Owned hub':'Ordinary station'}</strong></div>`+
   (hub?'<div class="sheet-row"><span>Maintenance bays</span><strong>1</strong></div><div class="sheet-row"><span>Based trains</span><strong>0</strong></div>':'')+
   '<div class="sheet-row"><span>Services</span><strong>None</strong></div>'+
   (hub?'<button type="button" class="sheet-action" id="show-hub">View in Hubs</button>':'')
  );
  $('#show-hub')?.addEventListener('click',()=>switchTab('hubs'));
}
function openCorridor(corridor){
  const names=corridor.stationIds.map(id=>stations.find(s=>s.id===id)?.name||id);
  openSheet('EXAMPLE CORRIDOR',corridor.name,
    '<p class="sheet-caption">This is a manually defined test corridor. It is <strong>not</strong> a purchasable access section. Final boundaries, rail topology, demand and pricing remain undecided.</p>'+
    `<div class="sheet-row"><span>Stations in test data</span><strong>${names.length}</strong></div>`+
    `<div class="sheet-row"><span>Access status</span><strong>Not owned</strong></div>`+
    `<p><strong>Example stops</strong><br>${names.map(escapeHTML).join(' · ')}</p>`+
    '<button type="button" class="sheet-action" disabled aria-disabled="true">Acquisition not available in UI prototype</button>'
  );
}
$('#ipswich-hub-card').addEventListener('click',()=>{switchTab('map'); const st=stations.find(s=>s.id==='ipswich');map?.flyTo({center:st.coordinates,zoom:11});openStation(st);});
$('#info-button').addEventListener('click',()=>openSheet('ABOUT','UI prototype v0.1','<p>This is an interface prototype only. The routes, purchases, passenger demand, financial data, fleet and simulation have not been implemented.</p><p>Railway lines are hand-drawn illustrative shapes, not validated infrastructure alignments. Data layer selections do not show real coverage or opportunity until the forecast model exists.</p>'));
$('#reset-view').addEventListener('click',()=>map?.flyTo({center:start,zoom:9.3,duration:700}));

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

try{
  map=new maplibregl.Map({container:'map',style:'https://tiles.openfreemap.org/styles/positron',center:start,zoom:9.3,maxZoom:16,minZoom:4,attributionControl:true});
  map.dragRotate.disable();map.touchZoomRotate.disableRotation();
  map.on('load',()=>{
    map.addSource('example-corridors',{type:'geojson',data:corridorsGeoJSON});
    map.addSource('example-stations',{type:'geojson',data:stationsGeoJSON});
    map.addLayer({id:'corridor-halo',type:'line',source:'example-corridors',paint:{'line-color':'#ffffff','line-width':7,'line-opacity':.88}});
    map.addLayer({id:'corridor-lines',type:'line',source:'example-corridors',paint:{'line-color':'#7e8d94','line-width':3.2,'line-opacity':.95}});
    map.addLayer({id:'station-dots',type:'circle',source:'example-stations',filter:['!=',['get','hub'],true],paint:{'circle-radius':['interpolate',['linear'],['zoom'],7,3,11,5,14,7],'circle-color':'#ffffff','circle-stroke-color':'#6c7e78','circle-stroke-width':2}});
    map.addLayer({id:'station-labels',type:'symbol',source:'example-stations',minzoom:9,layout:{'text-field':['get','name'],'text-size':11,'text-offset':[0,1.25],'text-anchor':'top','text-allow-overlap':false},paint:{'text-color':'#2b4840','text-halo-color':'#fff','text-halo-width':1.8}});
    map.addLayer({id:'hub-circle',type:'circle',source:'example-stations',filter:['==',['get','hub'],true],paint:{'circle-radius':11,'circle-color':'#08745e','circle-stroke-width':3,'circle-stroke-color':'#fff'}});
    map.addLayer({id:'hub-symbol',type:'symbol',source:'example-stations',filter:['==',['get','hub'],true],layout:{'text-field':'◆','text-size':13,'text-allow-overlap':true},paint:{'text-color':'#ffffff'}});
    map.on('click','hub-circle',e=>{const st=stations.find(s=>s.id===e.features?.[0]?.properties?.id);if(st)openStation(st);});
    map.on('click','station-dots',e=>{const st=stations.find(s=>s.id===e.features?.[0]?.properties?.id);if(st)openStation(st);});
    map.on('click','corridor-lines',e=>{const corridor=corridors.find(c=>c.id===e.features?.[0]?.properties?.id);if(corridor)openCorridor(corridor);});
    ['hub-circle','station-dots','corridor-lines'].forEach(id=>{map.on('mouseenter',id,()=>map.getCanvas().style.cursor='pointer');map.on('mouseleave',id,()=>map.getCanvas().style.cursor='');});
  });
  map.on('error',error=>{console.warn('Map resource error',error.error);});
}catch(error){console.error(error);$('#map').innerHTML='<p style="padding:30px;">Unable to start the interactive map. Check your internet connection and that your browser supports WebGL.</p>';}
