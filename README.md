# Railway Manager UI v0.4 — Network Rail importer foundation

**Status:** importer and optional map layer prepared and syntax-tested. **Archived Network Rail track data has NOT yet been imported**, because this environment cannot download the binary GIS files. The existing working v0.3 display remains the fallback. No simulation, purchasable sections or operational routing exists.

## Why this is different
- Source is Network Rail's archived `VectorLinks` track-centre-line shapefile (not the imaginary ELR reference lines).
- Reproducible converter `tools/import_network_rail.py` downloads five source files from `openraildata/network-rail-gis`, converts British National Grid EPSG:27700 to WGS84 EPSG:4326 and exports candidate features to GeoJSON.
- GitHub Actions workflow `.github/workflows/prepare-network-rail.yml` can run conversion on GitHub's computers without a laptop. Output is a **downloadable Actions artifact**, **not auto-deployed**. This protects the working site until validation.
- When the generated East Anglia GeoJSON is placed at `data/derived/network-rail-east.geojson`, the UI automatically draws it; without it, existing OpenFreeMap-derived rail tile geometry remains.
- `national` scope generates a GB-wide candidate extract **as an artifact only**. We deliberately don't load national raw GeoJSON on an iPhone until tiling/size/performance is designed.

## Running in GitHub (after uploading this package into repository root)
1. In repository `rail`, choose **Actions** → **Prepare Network Rail geometry** → **Run workflow** → scope `east`.
2. After the workflow completes, open the run and download the `network-rail-east-candidate` artifact ZIP. It contains `network-rail-east.geojson` and metadata.
3. Inspect the metadata count and sample lines first. Upload the GeoJSON under `data/derived/` only after reviewing its extent and size. The website will then use it automatically.
4. Optionally run `national` later, but do **not** upload the raw national GeoJSON directly to the game.

If GitHub Actions are disabled or dependency downloads fail, the existing UI is unaffected.

## Data warnings
- Repository archived August 2024; source may not represent current infrastructure.
- The output reflects physical track shapes, including sidings/yards, branches and parallel tracks, not a passenger-service-only network.
- Shapefile line endpoints and close geometry **must not be assumed to imply operational connectivity**. Junctions, station-to-track matching, duplicate physical alignments, distances and permissions require validation before route planning.
- The East bounding box is deliberately generous and may include unrelated infrastructure; it is a geographic extract, not a corridor definition.
- OGL 3.0: attribute Network Rail and the source; see source repository and https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/ . Map continues to show OpenFreeMap/OSM attribution.

Source: https://github.com/openraildata/network-rail-gis , `network-model/VectorLinks`.
Source caveats: https://github.com/openraildata/network-rail-gis/blob/main/CAVEATS.md

## Validation to complete
- Actually run GitHub Actions extraction and inspect counts and sample features.
- Visual verification around Ipswich, Manningtree, Norwich, Lowestoft, Felixstowe and Cambridge.
- Overlay hit testing and iPhone rendering of imported geometry.
- Build validated station/track junction graph (not part of this version).
- Determine suitable GB-wide segmented storage and rendering approach.

The separate v0.3 candidate graph remains explicitly schematic and unverified.
