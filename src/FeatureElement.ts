import { MapboxGeoJSONFeature as MapGeoJSONFeature } from "mapbox-gl";

import { Point, LineString, Polygon, MultiPolygon } from "geojson";
import { Etymology, etymologyToDomElement } from "./EtymologyElement";
import { debugLog } from "./config";

interface FeatureProperties {
    alt_name?: string;
    commons?: string;
    el_id?: number;
    etymologies: Etymology[] | string; // Even though it is received as an array, for some reason Mapbox GL JS stringifies it as JSON
    gender_color?: string;
    name?: string;
    osm_id?: number;
    osm_type?: string;
    source_color?: string;
    text_etymology?: string;
    text_etymology_descr?: string;
    type_color?: string;
    wikidata?: string;
    wikipedia?: string;
}

export function featureToDomElement(feature: MapGeoJSONFeature, currentZoom = 12.5): HTMLElement {
    const detail_template = document.getElementById('detail_template');
    if (!(detail_template instanceof HTMLTemplateElement))
        throw new Error("Missing etymology template");

    const properties = feature.properties as FeatureProperties,
        etymologies = typeof properties?.etymologies === 'string' ? JSON.parse(properties?.etymologies) as Etymology[] : properties?.etymologies,
        detail_container = detail_template.content.cloneNode(true) as HTMLElement,
        osm_full_id = properties.osm_type && properties.osm_id ? properties.osm_type + '/' + properties.osm_id : null;
    //detail_container.dataset.el_id = properties.el_id?.toString();

    debugLog("featureToDomElement", {
        el_id: properties.el_id, feature, etymologies, detail_container
    });

    const element_name = detail_container.querySelector<HTMLElement>('.element_name');
    if (!element_name) {
        console.warn("Missing element_name");
    } else if (properties.name && properties.name != 'null') {
        element_name.innerText = '📍 ' + properties.name;
    }

    const element_alt_name = detail_container.querySelector<HTMLElement>('.element_alt_name');
    if (!element_alt_name) {
        console.warn("Missing element_alt_name");
    } else if (properties.alt_name && properties.alt_name != 'null') {
        element_alt_name.innerText = '("' + properties.alt_name + '")';
    }

    const wikidata = properties.wikidata,
        element_wikidata_button = detail_container.querySelector<HTMLAnchorElement>('.element_wikidata_button');
    if (!element_wikidata_button) {
        console.warn("Missing element_wikidata_button");
    } else if (wikidata && wikidata != 'null') {
        element_wikidata_button.href = `https://www.wikidata.org/wiki/${wikidata}`;
        element_wikidata_button.classList.remove("hiddenElement");
    } else {
        element_wikidata_button.classList.add("hiddenElement");
    }

    const wikipedia = properties.wikipedia,
        element_wikipedia_button = detail_container.querySelector<HTMLAnchorElement>('.element_wikipedia_button');
    if (!element_wikipedia_button) {
        console.warn("Missing element_wikipedia_button");
    } else if (wikipedia && wikipedia != 'null') {
        element_wikipedia_button.href = `https://www.wikipedia.org/wiki/${wikipedia}`;
        element_wikipedia_button.classList.remove("hiddenElement");
    } else {
        element_wikipedia_button.classList.add("hiddenElement");
    }

    const commons = properties.commons,
        element_commons_button = detail_container.querySelector<HTMLAnchorElement>('.element_commons_button');
    if (!element_commons_button) {
        console.warn("Missing element_commons_button");
    } else if (commons && commons != 'null') {
        element_commons_button.href = `https://commons.wikimedia.org/wiki/${commons}`;
        element_commons_button.classList.remove("hiddenElement");
    } else {
        element_commons_button.classList.add("hiddenElement");
    }

    const element_osm_button = detail_container.querySelector<HTMLAnchorElement>('.element_osm_button');
    if (!element_osm_button) {
        console.warn("Missing element_osm_button");
    } else if (osm_full_id) {
        element_osm_button.href = 'https://www.openstreetmap.org/' + osm_full_id;
        element_osm_button.classList.remove("hiddenElement");
    } else {
        element_osm_button.classList.add("hiddenElement");
    }

    const element_mapcomplete_button = detail_container.querySelector<HTMLAnchorElement>('.element_mapcomplete_button');
    if (!element_mapcomplete_button) {
        console.warn("Missing element_mapcomplete_button");
    } else if (osm_full_id) {
        element_mapcomplete_button.href = 'https://mapcomplete.osm.be/etymology.html#' + osm_full_id;
        element_mapcomplete_button.classList.remove("hiddenElement");
    } else {
        element_mapcomplete_button.classList.add("hiddenElement");
    }

    const element_location_button = detail_container.querySelector<HTMLAnchorElement>('.element_location_button');
    if (!element_location_button) {
        console.warn("Missing element_location_button");
    } else {
        let coord = (feature.geometry as Point | LineString | Polygon | MultiPolygon).coordinates;
        while (Array.isArray(coord) && Array.isArray(coord[0])) {
            coord = coord[0];
        }
        const lon = coord[0], lat = coord[1];
        element_location_button.href = `#${lon},${lat},${currentZoom}`;
    }

    const etymologies_container = detail_container.querySelector<HTMLElement>('.etymologies_container');
    if (!etymologies_container) {
        console.warn("Missing etymologies_container");
    } else {
        etymologies.filter(e => e?.wikidata).forEach(function (ety) {
            try {
                etymologies_container.appendChild(etymologyToDomElement(ety, currentZoom))
            } catch (err) {
                console.error("Failed adding etymology", ety, err);
            }
        });

        const textEtyName = properties.text_etymology === "null" ? undefined : properties.text_etymology,
            textEtyNameExists = typeof textEtyName === "string" && !!textEtyName,
            textEtyDescr = properties.text_etymology_descr === "null" ? undefined : properties.text_etymology_descr,
            textEtyDescrExists = typeof textEtyDescr === "string" && !!textEtyDescr;
        let textEtyShouldBeShown = textEtyNameExists || textEtyDescrExists;

        if (textEtyNameExists && !textEtyDescrExists) {
            // If the text etymology has only the name and it's already shown by one of the Wikidata etymologies' name/description, hide it
            textEtyShouldBeShown = etymologies.some((etymology) =>
                !etymology?.name?.toLowerCase()?.includes(textEtyName.trim().toLowerCase()) &&
                !etymology?.description?.toLowerCase()?.includes(textEtyName.trim().toLowerCase())
            );
        }

        debugLog("featureToDomElement: showing text etymology? ", {
            feature, textEtyName, textEtyNameExists, textEtyShouldBeShown, textEtyDescr, textEtyDescrExists
        });
        if (textEtyShouldBeShown) {
            etymologies_container.appendChild(etymologyToDomElement({
                name: textEtyName,
                description: textEtyDescr,
                from_osm: true,
                from_osm_type: properties.osm_type,
                from_osm_id: properties.osm_id,
                from_wikidata: false,
            }, currentZoom));
        }
    }

    return detail_container;
}
