# Source presets

## Structure

Each file contains a preset in the form of a JSON object whose keys are documented in [SourcePreset.ts](../../src/model/SourcePreset.ts).

## Existing presets

### architect

See https://wiki.openstreetmap.org/wiki/OSM-Wikidata_Map_Framework#Open_Architect_Map

### artist

See https://wiki.openstreetmap.org/wiki/OSM-Wikidata_Map_Framework#Open_Artist_Map

### base

All geographic features from OpenStreetMap and Wikidata, without linked entities

### burial

See https://wiki.openstreetmap.org/wiki/OSM-Wikidata_Map_Framework#Open_Burial_Map

### etymology

See https://wiki.openstreetmap.org/wiki/OSM-Wikidata_Map_Framework#Open_Etymology_Map

### green_spaces

All green spaces from OpenStreetMap and Wikidata, without linked entities.

Elements from OSM are shown only if they include one of the following tags:
- leasure=park
- leasure=garden

Entities from Wikidata are shown only if they are instance of (P31) one of the following classes or one of their immediate subclasses:
- [Q1107656](https://www.wikidata.org/wiki/Q1107656) garden
- [Q22652](https://www.wikidata.org/wiki/Q22652) green space
- [Q22698](https://www.wikidata.org/wiki/Q22698) park
- [Q22746](https://www.wikidata.org/wiki/Q22746) urban park
- [Q16023747](https://www.wikidata.org/wiki/Q16023747) state park of the United States
