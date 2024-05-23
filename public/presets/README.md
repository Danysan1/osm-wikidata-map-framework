# Source presets

Each file contains a preset in the form of a JSON object whose keys are documented in [SourcePreset.ts](../../src/model/SourcePreset.ts).

## Existing presets

### [architect](./architect.json)

Displays the architects who created buildings and structures

Keys and properties used to find the associated entities which represent the architect/organization which designed the feature:
- `architect:wikidata=*`
- `wikidata=*` + [P84](https://www.wikidata.org/wiki/Property:P84) (architect)
- `wikidata=*` + [P287](https://www.wikidata.org/wiki/Property:P287) (designed by)

See it in action: [Open Architect Map](https://wiki.openstreetmap.org/wiki/OSM-Wikidata_Map_Framework#Open_Architect_Map)

### [artist](./artist.json)

Shows the artists who designed artworks and memorials.

Keys and properties used to find the associated entities which represent the artist(s) which realized the feature:
- `artist:wikidata=*`
- `wikidata=*` + [P170](https://www.wikidata.org/wiki/Property:P170) (creator)
- `wikidata=*` + [P50](https://www.wikidata.org/wiki/Property:P50) (author)

See it in action: [Open Artist Map](https://wiki.openstreetmap.org/wiki/OSM-Wikidata_Map_Framework#Open_Artist_Map)

### [base](./base.json)

All geographic features from OpenStreetMap and Wikidata, without filters or linked entities.

See it in action: [OSM-Wikidata Map](https://wiki.openstreetmap.org/wiki/OSM-Wikidata_Map_Framework#OSM-Wikidata_Map)

### [burial](./burial.json)

See https://wiki.openstreetmap.org/wiki/OSM-Wikidata_Map_Framework#Open_Burial_Map

### [etymology](./etymology.json)

See https://wiki.openstreetmap.org/wiki/OSM-Wikidata_Map_Framework#Open_Etymology_Map

### [green_spaces](./green_spaces.json)

All green spaces from OpenStreetMap and Wikidata, without linked entities.

Elements from OSM are shown only if they include one of the following tags:
- `leasure=park`
- `leasure=garden`

Entities from Wikidata are shown only if they are instance of (P31) one of the following classes or one of their immediate subclasses:
- [Q1107656](https://www.wikidata.org/wiki/Q1107656) (garden)
- [Q22652](https://www.wikidata.org/wiki/Q22652) (green space
- [Q22698](https://www.wikidata.org/wiki/Q22698) (park)
- [Q22746](https://www.wikidata.org/wiki/Q22746) (urban park)
- [Q16023747](https://www.wikidata.org/wiki/Q16023747) (state park of the United States)
