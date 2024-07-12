# Contributing to OSM-Wikidata Map Framework

**Any suggestion to improve this documentation page is really appreciated**.
You can edit it and open a merge request or you can open a new issue on [GitLab](https://gitlab.com/openetymologymap/osm-wikidata-map-framework/-/issues/new) or [GitHub](https://github.com/Danysan1/osm-wikidata-map-framework/issues) describing your suggestion.

You can find below some information useful to contribute to the OSM-Wikidata Map Framework codebase.

## Helping with translation

The translations for the title and description of the specific instance of OWMF is located in the `owmf_i18n_override` configuration.
For example, the title and description of Open Etymology Map are located in the [`.env.example` file in its repository](https://gitlab.com/openetymologymap/open-etymology-map/-/blob/main/.env.example).

All other translations are located in the [`front-end/public/locales/{LANGUAGE_CODE}/common.json`](front-end/public/locales/) files of this repository.
**You can translate this framework in new languages or fix errors in existing translations [on Transifex](https://app.transifex.com/osm-wikidata-maps/osm-wikidata-map-framework/dashboard/)**.

## Architecture info for contributors

This project is composed by two distinct components:

### Front-End 

This is the web application used for the actual visualization and exploration of the data. You can find all the info inside the [front-end](./front-end/) folder

### DB initialization

This is a data pipeline responsible for generating the .pmtiles and .csv file that can be optionally used to make the front-end faster. You can find all the info inside the [airflow](./airflow/) folder.

## Excluded elements

OWMF makes the choice to remove extremely big elements when fetching from OpenStreetMap for two reasons:

- They are often complex and heavy to download, elaborate and store from both a time and space point of view. Downloading the data for a small city without excluding containing areas can easily lead to download hundreds of megabytes, causing very long elaboration times on the back-end and causing almost all front-end user devices to hang or crash
- They hinder visualization of small elements. Map are always approximations of reality and it's normal to hide big elements at high zoom and most small elements at low zoom, in order to not overload the user with too many items. Being OWMF designed to show details only at high zoom it's appropriate to remove very big elements.

Tags causing elements to be removed include:

- `boundary=*`
- `type=boundary`
- `sqkm=*` (ex: [Persian Gulf](https://www.openstreetmap.org/relation/9326283), [Lake Superior](https://www.openstreetmap.org/relation/4039486))
- `end_date=*` or `route=historic`

This filtering is done in [OwmfFilterDAG](airflow/dags/OwmfFilterDAG.py) for the DB data and by [OverpassService](src/services/OverpassService.ts) for Overpass data.