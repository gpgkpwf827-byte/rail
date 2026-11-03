# Railway Manager — UI prototype v0.1

**Status:** UI code only, not a game. Initial implementation, not yet browser/device-tested.

## Scope
- Responsive iPhone-oriented shell and five navigation tabs.
- MapLibre GL JS using the OpenFreeMap Positron basemap.
- Three *illustrative* East Anglian railway corridor geometries and a small station dataset.
- Ipswich as the sole owned hub, selectable line/station sheets, station search and map reset.
- Coverage/opportunity buttons are UI placeholders only; they do not imply real demand data.
- No train animation, finance, purchase, simulation clock, saving or gameplay engine.

## How to run
Host the folder as a static site (for example with GitHub Pages). For local desktop use, from inside this folder run `python -m http.server 8000` and open `http://localhost:8000/`. The map requires internet access for the map library and OpenFreeMap tiles. A local file URL (`file://`) may fail due to JavaScript module restrictions.

## Data caution
`data/network.js` contains approximate *manually drafted* latitude/longitude points. They are not authoritative railway track shapes, routing topology, official railway distances or purchasable access section boundaries. Do not use them for operational distance, fares or access pricing. Replace/validate before scaling to GB.

## Provenance
MapLibre GL JS: https://maplibre.org/maplibre-gl-js/docs/ (BSD 3-Clause). OpenFreeMap: https://openfreemap.org/ (OSM/OpenMapTiles attribution shown on map). Railway test coordinates/geometry are prototype entries and must be validated against suitable licensed datasets prior to production.

## Next technical tasks
- Browser/iPhone Safari smoke tests and error inspection.
- Validate rail lines/station IDs and choose GB-wide licensed topology data.
- Improve hit targets and rail/station zoom thresholds.
- Introduce one shared canonical railway graph (with separate rendering geometry and operational sections) before any simulation logic.

No game mechanics, MVP or economics decisions are implied by this UI development.
