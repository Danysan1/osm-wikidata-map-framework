import { etymologyToDomElement } from "./EtymologyElement";

/**
 * 
 * @param {object} feature 
 * @return {HTMLElement}
 */
export function featureToDomElement(feature) {
    const etymologies = JSON.parse(feature.properties.etymologies),
        detail_container = document.getElementById('detail_template').content.cloneNode(true),
        element_wikidata_button = detail_container.querySelector('.element_wikidata_button'),
        element_wikipedia_button = detail_container.querySelector('.element_wikipedia_button'),
        element_commons_button = detail_container.querySelector('.element_commons_button'),
        element_osm_button = detail_container.querySelector('.element_osm_button'),
        element_mapcomplete_button = detail_container.querySelector('.element_mapcomplete_button'),
        element_location_button = detail_container.querySelector('.element_location_button'),
        etymologies_container = detail_container.querySelector('.etymologies_container'),
        osm_full_id = feature.properties.osm_type + '/' + feature.properties.osm_id,
        mapcomplete_url = 'https://mapcomplete.osm.be/etymology.html#' + osm_full_id,
        osm_url = 'https://www.openstreetmap.org/' + osm_full_id;

    console.info("featureToDomElement", {
        el_id: feature.properties.el_id,
        feature,
        etymologies,
        detail_container,
        etymologies_container
    });

    if (feature.properties.name && feature.properties.name != 'null') {
        detail_container.querySelector('.element_name').innerText = '📍 ' + feature.properties.name;
    }

    if (feature.properties.alt_name && feature.properties.alt_name != 'null') {
        detail_container.querySelector('.element_alt_name').innerText = '("' + feature.properties.alt_name + '")';
    }

    const wikidata = feature.properties.wikidata;
    if (!element_wikidata_button) {
        console.warn("Missing element_wikidata_button");
    } else if (wikidata && wikidata != 'null') {
        element_wikidata_button.href = `https://www.wikidata.org/wiki/${wikidata}`;
        element_wikidata_button.style.display = 'inline-flex';
    } else {
        element_wikidata_button.style.display = 'none';
    }

    const wikipedia = feature.properties.wikipedia;
    if (!element_wikipedia_button) {
        console.warn("Missing element_wikipedia_button");
    } else if (wikipedia && wikipedia != 'null') {
        element_wikipedia_button.href = `https://www.wikipedia.org/wiki/${wikipedia}`;
        element_wikipedia_button.style.display = 'inline-flex';
    } else {
        element_wikipedia_button.style.display = 'none';
    }

    const commons = feature.properties.commons;
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
        let coord = feature.geometry.coordinates;
        while (Array.isArray(coord) && Array.isArray(coord[0])) {
            coord = coord[0];
        }
        element_location_button.href = "#" + coord[0] + "," + coord[1] + ",18";
    }

    etymologies.filter(x => x != null).forEach(function (ety) {
        try {
            etymologies_container.appendChild(etymologyToDomElement(ety))
        } catch (err) {
            console.error("Failed adding etymology", { ety, err });
        }
    });

    const text_etymology = feature.properties.text_etymology;
    if (text_etymology && typeof text_etymology == 'string' && text_etymology != 'null') {
        const textEtymologyAlreadyShownByWikidata = etymologies.some(etymology => {
            const etymologyName = etymology?.name?.toLowerCase();
            return typeof etymologyName == 'string' && etymologyName.includes(text_etymology.trim().toLowerCase());
        });
        let ety_descr = feature.properties.text_etymology_descr;
        ety_descr = ety_descr && typeof ety_descr == 'string' && ety_descr != 'null' ? ety_descr : null;
        if (!ety_descr && textEtymologyAlreadyShownByWikidata) {
            console.info("featureToDomElement: ignoring text etymology because already shown");
        } else {
            console.info("featureToDomElement: showing text etymology: ", { feature, text_etymology, ety_descr });
            etymologies_container.appendChild(etymologyToDomElement({
                name: text_etymology,
                description: ety_descr,
                from_osm: true,
                from_osm_type: feature.properties.osm_type,
                from_osm_id: feature.properties.osm_id
            }));
        }
    }

    return detail_container;
}
