# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OSM-Wikidata Map Framework (OWMF) is a framework for creating interactive maps that combine OpenStreetMap and Wikidata data. It consists of two main components, each with its own `CLAUDE.md`, `README.md` and `docker-compose.yml`:
- `front-end/` folder: Next.js front-end web application for map visualization (see `front-end/CLAUDE.md`)
- `airflow/` folder: Apache Airflow DAGs (data pipelines) for generating PMTiles vector tiles (see `airflow/CLAUDE.md`)

## Data Flow (Big Picture)

The two components are connected by the artifacts the pipeline produces, not by direct calls:

1. `airflow/` DAGs download OSM + Wikidata data into a PostGIS DB, then export **PMTiles** vector tiles (and optionally push to a remote DB / S3 bucket).
2. `front-end/` consumes data at runtime from one of several interchangeable backends (see the `MapService` strategy in `front-end/CLAUDE.md`): the pre-generated PMTiles, or live APIs (Overpass, Postpass, QLever, Wikidata SPARQL).

Running the airflow pipeline is optional — the front-end works against live APIs alone; PMTiles just make it faster.

## Configuration

The root [`.env.example`](.env.example) is the single documented source of all configuration and is shared by both components (each copies it to its own `.env`). Front-end variables are exposed to the browser via the `NEXT_PUBLIC_OWMF_` prefix; the same underlying names (without prefix) drive the pipeline. When adding a config option, document it in the root `.env.example`.

## Cross-Cutting Invariant: Boundary / Big-Element Filtering

The rules for what counts as a "boundary" or oversized element (`boundary=*`, `type=boundary`, `sqkm=*`, `place=region|sea|island|archipelago`, etc.) are implemented **twice** and must stay consistent between:
- Pipeline: [`airflow/plugins/OwmfFilterDAG.py`](airflow/plugins/OwmfFilterDAG.py)
- Live queries: [`OverpassService`](front-end/src/services/OverpassService/OverpassService.ts) / [`PostpassService`](front-end/src/services/PostpassService/PostpassService.ts)

These elements are excluded (or shown only above the threshold zoom) to avoid downloading/rendering hundreds of MB and to keep small features visible. See [CONTRIBUTING.md](CONTRIBUTING.md) for the rationale.

## Repository Hosting & CI

The repo is dual-hosted: **GitLab** (primary; CI/CD in [`.gitlab-ci.yml`](.gitlab-ci.yml) builds the Next.js static export and deploys it to GitLab Pages on tags/default branch) and a **GitHub** mirror. Translations are managed on Transifex (`transifex.yml`), not edited directly except in `front-end/public/locales/`.
