# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The code in this folder is a Next.js+Typescript project that is responsible for rendering the front-end of OWMF-based projects, the actual map that the user can use to explore the data.

## Common Commands

All commands run from this directory:

```bash
npm install          # Install dependencies
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Build for production
npm run lint         # Run ESLint
npm test             # Run Jest tests
```

For API client code generation (from `openapi/`):
```bash
npm install && npm run generate
```

## Architecture

### Service Layer (Strategy Pattern)

The `MapService` interface (`src/services/MapService.ts`) defines how to fetch map data. Implementations:
- `OverpassService` - Queries Overpass API for OSM data
- `PostpassService` - Uses Postpass API
- `QLeverMapService` - SPARQL queries via QLever
- `WikidataMapService` - Direct Wikidata SPARQL queries
- `CombinedCachedMapService` - Combines multiple backends with caching

Services are selected based on backend configuration and transform responses to `OwmfResponse` format.

### State Management (React Context)

- `UrlFragmentContext` - Syncs map state (lat, lon, zoom, color scheme) with URL hash
- `SourcePresetContext` - Current data source preset configuration
- `BackgroundStyleContext` - Map tile background selection

### Client-Side Caching (IndexedDB via Dexie)

Located in `src/db/`:
- `MapDatabase` - Caches map element responses
- `EntityDetailsDatabase` - Caches Wikidata entity details
- `StatsDatabase` - Caches statistics

### Key Data Models

- `OwmfResponse` - GeoJSON FeatureCollection with OWMF extensions (language, truncation flags, entity counts)
- `OwmfFeature` - GeoJSON Feature with `OwmfFeatureProperties` (OSM IDs, linked entities, Wikidata references)
- `LinkedEntity` - Connection between a map element and a related Wikidata entity
- `SourcePreset` - Configuration for data sources (OSM tags, Wikidata properties, zoom levels)

### Generated Code

`src/generated/` contains auto-generated TypeScript clients from OpenAPI specs in `openapi/`. Do not edit manually.

## Configuration

Configuration is via environment variables (see `.env.example` for full documentation):

**Backend selection:**
- `NEXT_PUBLIC_OWMF_overpass_api_url` - Overpass API endpoint
- `NEXT_PUBLIC_OWMF_pmtiles_base_url` - PMTiles vector tiles URL
- `NEXT_PUBLIC_OWMF_qlever_instance_url` - QLever SPARQL endpoint

**Data source:**
- `NEXT_PUBLIC_OWMF_osm_filter_tags` - OSM tags to filter (JSON array)
- `NEXT_PUBLIC_OWMF_osm_wikidata_keys` - OSM keys linking to Wikidata (JSON array)
- `NEXT_PUBLIC_OWMF_osm_wikidata_properties` - Wikidata properties to fetch (JSON array)

**Map behavior:**
- `NEXT_PUBLIC_OWMF_threshold_zoom_level` - Zoom level where behavior changes (default: 12)
- `NEXT_PUBLIC_OWMF_min_zoom_level` - Minimum zoom for non-PMTiles backends (default: 9)

## Zoom-Level Behavior

The map behaves differently based on zoom:
- Below `min_zoom_level`: Nothing shown (non-PMTiles backends) or boundaries only (PMTiles)
- Between `min_zoom_level` and `threshold_zoom_level`: Clustered counts (non-PMTiles) or boundaries (PMTiles)
- Above `threshold_zoom_level`: Full element details

## Deployment

**Static export** (any web server):
```bash
owmf_static_export=true npm run build  # Output in out/
```

**Dynamic** (requires Node.js):
```bash
owmf_static_export=false npm run build
npm run start
```

## Excluded Elements

Large elements (boundaries, historical routes, elements with `sqkm` tag) are excluded to prevent performance issues. Filtering is in `OwmfFilterDAG.py` (DB) and `OverpassService` (live queries).
