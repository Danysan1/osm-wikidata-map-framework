import { MapboxGeoJSONFeature } from "mapbox-gl";
import { etymologyToDomElement } from "./EtymologyElement";

/**
 * 
 * @param {object} feature 
 * @return {HTMLElement}
 */
export function featureToDomElement(feature:MapboxGeoJSONFeature) {
    const properties = feature.properties as any,
        etymologies = JSON.parse(properties?.etymologies),
        detail_template = document.getElementById('detail_template');
    if(!(detail_template instanceof HTMLTemplateElement))
        throw new Error("Missing etymology template");
    const detail_container = detail_template.content.cloneNode(true) as HTMLElement,
        element_wikidata_button = detail_container.querySelector('a.element_wikidata_button') as HTMLAnchorElement,
        element_wikipedia_button = detail_container.querySelector('a.element_wikipedia_button') as HTMLAnchorElement,
        element_commons_button = detail_container.querySelector('a.element_commons_button') as HTMLAnchorElement,
        element_osm_button = detail_container.querySelector('a.element_osm_button') as HTMLAnchorElement,
        element_mapcomplete_button = detail_container.querySelector('a.element_mapcomplete_button') as HTMLAnchorElement,
        element_location_button = detail_container.querySelector('a.element_location_button') as HTMLAnchorElement,
        element_name = detail_container.querySelector('.element_name') as HTMLElement,
        element_alt_name = detail_container.querySelector('.element_alt_name') as HTMLElement,
        etymologies_container = detail_container.querySelector('.etymologies_container') as HTMLElement,
        osm_full_id = properties.osm_type + '/' + properties.osm_id,
        mapcomplete_url = 'https://mapcomplete.osm.be/etymology.html#' + osm_full_id,
        osm_url = 'https://www.openstreetmap.org/' + osm_full_id;

    console.info("featureToDomElement", {
        el_id: properties.el_id,
        feature,
        etymologies,
        detail_container,
        etymologies_container
    });

    if (properties.name && properties.name != 'null') {
        element_name.innerText = '📍 ' + properties.name;
    }

    if (properties.alt_name && properties.alt_name != 'null') {
        element_alt_name.innerText = '("' + properties.alt_name + '")';
    }

    const wikidata: string|null = properties.wikidata;
    if (!element_wikidata_button) {
        console.warn("Missing element_wikidata_button");
    } else if (wikidata && wikidata != 'null') {
        element_wikidata_button.href = `https://www.wikidata.org/wiki/${wikidata}`;
        element_wikidata_button.style.display = 'inline-flex';
    } else {
        element_wikidata_button.style.display = 'none';
    }

    const wikipedia = properties.wikipedia;
    if (!element_wikipedia_button) {
        console.warn("Missing element_wikipedia_button");
    } else if (wikipedia && wikipedia != 'null') {
        element_wikipedia_button.href = `https://www.wikipedia.org/wiki/${wikipedia}`;
        element_wikipedia_button.style.display = 'inline-flex';
    } else {
        element_wikipedia_button.style.display = 'none';
    }

    const commons = properties.commons;
    if (!element_commons_button) {
        console.warn("Missing element_commons_button");
    } else if (commons && commons != 'null') {
        element_commons_button.href = `https://commons.wikimedia.org/wiki/${commons}`;
        element_commons_button.style.display = 'inline-flex';
    } else {
        element_commons_button.style.display = 'none';
    }

    if (!element_osm_button) {
        console.warn("Missing element_osm_button");
    } else {
        element_osm_button.href = osm_url;
    }

    if (!element_mapcomplete_button) {
        console.warn("Missing element_mapcomplete_button");
    } else {
        element_mapcomplete_button.href = mapcomplete_url;
    }

    if (!element_location_button) {
        console.warn("Missing element_location_button");
    } else {
        let coord = (feature.geometry as any).coordinates;
        while (Array.isArray(coord) && Array.isArray(coord[0])) {
            coord = coord[0];
        }
        element_location_button.href = "#" + coord[0] + "," + coord[1] + ",18";
    }

    etymologies.filter((x:object|null) => x != null).forEach(function (ety:any) {
        try {
            etymologies_container.appendChild(etymologyToDomElement(ety))
        } catch (err) {
            console.error("Failed adding etymology", ety, err);
        }
    });

    const text_etymology = properties.text_etymology;
    if (text_etymology && typeof text_etymology == 'string' && text_etymology != 'null') {
        const textEtymologyAlreadyShownByWikidata = etymologies.some((etymology:any) => {
            const etymologyName = etymology?.name?.toLowerCase();
            return typeof etymologyName == 'string' && etymologyName.includes(text_etymology.trim().toLowerCase());
        });
        let ety_descr = properties.text_etymology_descr;
        ety_descr = ety_descr && typeof ety_descr == 'string' && ety_descr != 'null' ? ety_descr : null;
        if (!ety_descr && textEtymologyAlreadyShownByWikidata) {
            console.info("featureToDomElement: ignoring text etymology because already shown");
        } else {
            console.info("featureToDomElement: showing text etymology: ", { feature, text_etymology, ety_descr });
            etymologies_container.appendChild(etymologyToDomElement({
                name: text_etymology,
                description: ety_descr,
                from_osm: true,
                from_osm_type: properties.osm_type,
                from_osm_id: properties.osm_id
            }));
        }
    }

    return detail_container;
}
