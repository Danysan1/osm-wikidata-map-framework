//import { GeoJSONFeature } from 'maplibre-gl';
import { MapboxGeoJSONFeature as GeoJSONFeature } from 'mapbox-gl';

import { Point, LineString, Polygon, MultiPolygon } from "geojson";
import { Etymology, EtymologyDetails, etymologyToDomElement } from "./EtymologyElement";
import { debugLog, getBoolConfig } from "./config";
import { translateContent, translateAnchorTitle, loadTranslator } from "./i18n";
import { showLoadingSpinner, showSnackbar } from "./snackbar";
import { WikidataService } from "./services/WikidataService";
import { imageToDomElement } from "./ImageElement";
import { logErrorMessage } from "./monitoring";

interface FeatureProperties {
    country_color?: string;
    alt_name?: string;
    official_name?: string;
    commons?: string;
    el_id?: number;
    etymologies: Etymology[] | string; // Even though it is received as an array, for some reason Mapbox GL JS stringifies it as JSON
    gender_color?: string;
    name?: string;
    osm_id?: number;
    osm_type?: string;
    picture?: string;
    source_color?: string;
    text_etymology?: string;
    text_etymology_descr?: string;
    type_color?: string;
    wikidata?: string;
    wikipedia?: string;
}

export function featureToDomElement(feature: GeoJSONFeature, currentZoom = 12.5): HTMLElement {
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

    translateContent(detail_container, ".i18n_loading", "feature_details.loading");
    translateContent(detail_container, ".i18n_report_problem", "feature_details.report_problem");
    translateAnchorTitle(detail_container, ".title_i18n_report_problem", "feature_details.report_problem");
    translateContent(detail_container, ".i18n_location", "feature_details.location");
    translateAnchorTitle(detail_container, ".title_i18n_location", "feature_details.location");

    const element_name = detail_container.querySelector<HTMLElement>('.element_name');
    if (!element_name) {
        debugLog("Missing element_name");
    } else if (properties.name && properties.name != 'null') {
        element_name.innerText = '📍 ' + properties.name;
    }

    const element_alt_names = detail_container.querySelector<HTMLElement>('.element_alt_names'),
        alt_names = [properties.official_name, properties.alt_name].filter(
            name => name && name !== 'null' && name !== properties.name
        );
    if (!element_alt_names) {
        debugLog("Missing element_alt_names");
    } else if (alt_names.length > 0) {
        element_alt_names.innerText =
            "(" + alt_names.map(name => `"${name}"`).join(" / ") + ")";
    }

    const wikidata = properties.wikidata,
        commons = properties.commons,
        picture = properties.picture,
        feature_pictures = detail_container.querySelector<HTMLDivElement>('.feature_pictures');
    if (!feature_pictures) {
        debugLog("Missing pictures element");
    } else if (picture && picture !== 'null') {
        debugLog("Using picture from feature 'picture' property", { picture });
        feature_pictures.appendChild(imageToDomElement(picture))
        feature_pictures.classList.remove("hiddenElement");
    } else if (commons?.includes("File:")) {
        debugLog("Using picture from feature 'commons' property", { commons });
        feature_pictures.appendChild(imageToDomElement(commons));
        feature_pictures.classList.remove("hiddenElement");
    } else if (wikidata && wikidata !== 'null') {
        debugLog("Using picture from feature 'wikidata' property", { wikidata });
        new WikidataService().getCommonsImageFromWikidataID(wikidata).then(img => {
            if (img) {
                feature_pictures.appendChild(imageToDomElement(img));
                feature_pictures.classList.remove("hiddenElement");
            } else {
                feature_pictures.classList.add("hiddenElement");
            }
        }).catch(err => {
            logErrorMessage("Failed getting image from Wikidata", 'error', err);
            feature_pictures.classList.add("hiddenElement");
        });
    } else {
        feature_pictures.classList.add("hiddenElement");
    }

    const element_wikidata_button = detail_container.querySelector<HTMLAnchorElement>('.element_wikidata_button');
    if (!element_wikidata_button) {
        debugLog("Missing element_wikidata_button");
    } else if (wikidata && wikidata != 'null') {
        element_wikidata_button.href = `https://www.wikidata.org/wiki/${wikidata}`;
        element_wikidata_button.classList.remove("hiddenElement");
    } else {
        element_wikidata_button.classList.add("hiddenElement");
    }

    const wikipedia = properties.wikipedia,
        element_wikipedia_button = detail_container.querySelector<HTMLAnchorElement>('.element_wikipedia_button');
    if (!element_wikipedia_button) {
        debugLog("Missing element_wikipedia_button");
    } else if (wikipedia && wikipedia != 'null') {
        element_wikipedia_button.href = `https://www.wikipedia.org/wiki/${wikipedia}`;
        element_wikipedia_button.classList.remove("hiddenElement");
    } else {
        element_wikipedia_button.classList.add("hiddenElement");
    }

    const element_commons_button = detail_container.querySelector<HTMLAnchorElement>('.element_commons_button');
    if (!element_commons_button) {
        debugLog("Missing element_commons_button");
    } else if (commons && commons != 'null') {
        element_commons_button.href = `https://commons.wikimedia.org/wiki/${commons}`;
        element_commons_button.classList.remove("hiddenElement");
    } else {
        element_commons_button.classList.add("hiddenElement");
    }

    const element_osm_button = detail_container.querySelector<HTMLAnchorElement>('.element_osm_button');
    if (!element_osm_button) {
        debugLog("Missing element_osm_button");
    } else if (osm_full_id) {
        element_osm_button.href = 'https://www.openstreetmap.org/' + osm_full_id;
        element_osm_button.classList.remove("hiddenElement");
    } else {
        element_osm_button.classList.add("hiddenElement");
    }

    const show_feature_mapcomplete = getBoolConfig("show_feature_mapcomplete"),
        element_mapcomplete_button = detail_container.querySelector<HTMLAnchorElement>('.element_mapcomplete_button');
    if (!element_mapcomplete_button) {
        debugLog("Missing element_mapcomplete_button");
    } else if (show_feature_mapcomplete && osm_full_id) {
        element_mapcomplete_button.href = 'https://mapcomplete.osm.be/etymology.html#' + osm_full_id;
        element_mapcomplete_button.classList.remove("hiddenElement");
    } else {
        element_mapcomplete_button.classList.add("hiddenElement");
    }

    const element_location_button = detail_container.querySelector<HTMLAnchorElement>('.element_location_button');
    if (!element_location_button) {
        debugLog("Missing element_location_button");
    } else if (osm_full_id || properties.commons || properties.wikipedia || properties.wikidata) { // Hide this button if it is the only one
        let coord = (feature.geometry as Point | LineString | Polygon | MultiPolygon).coordinates;
        while (Array.isArray(coord) && Array.isArray(coord[0])) {
            coord = coord[0];
        }
        const lon = coord[0], lat = coord[1];
        element_location_button.href = `#${lon},${lat},${currentZoom + 1}`;
        element_location_button.classList.remove("hiddenElement");
    } else {
        element_location_button.classList.add("hiddenElement");
    }

    const etymologies_container = detail_container.querySelector<HTMLElement>('.etymologies_container');
    if (!etymologies_container) {
        debugLog("Missing etymologies_container");
    } else if (getBoolConfig("eager_full_etymology_download")) {
        showEtymologies(properties, etymologies, etymologies_container, currentZoom);
    } else {
        showLoadingSpinner(true);
        downloadEtymologyDetails(etymologies).then(filledEtymologies => {
            showLoadingSpinner(false);
            showEtymologies(properties, filledEtymologies, etymologies_container, currentZoom);
        });
    }

    return detail_container;
}

function showEtymologies(properties: FeatureProperties, etymologies: Etymology[], etymologies_container: HTMLElement, currentZoom: number) {
    // Sort entities by Wikidata Q-ID length (shortest ID usually means most famous)
    etymologies.sort((a, b) => (a.wikidata?.length || 0) - (b.wikidata?.length || 0)).forEach((ety) => {
        if (ety?.wikidata) {
            try {
                etymologies_container.appendChild(etymologyToDomElement(ety, currentZoom))
            } catch (err) {
                console.error("Failed adding etymology", ety, err);
            }
        } else {
            console.warn("Found etymology without Wikidata ID", ety);
        }
    });

    const textEtyName = properties.text_etymology === "null" ? undefined : properties.text_etymology,
        textEtyNameExists = typeof textEtyName === "string" && !!textEtyName,
        textEtyNames = textEtyNameExists ? textEtyName.split(";") : [],
        textEtyDescr = properties.text_etymology_descr === "null" ? undefined : properties.text_etymology_descr,
        textEtyDescrExists = typeof textEtyDescr === "string" && !!textEtyDescr,
        textEtyDescrs = textEtyDescrExists ? textEtyDescr.split(";") : [];

    for (let n = 0; n < Math.max(textEtyNames.length, textEtyDescrs.length); n++) {
        const nthTextEtyNameExists = n < textEtyNames.length,
            nthTextEtyDescrExists = n < textEtyDescrs.length,
            // If the text etymology has only the name and it's already shown by one of the Wikidata etymologies' name/description, hide it
            textEtyShouldBeShown = nthTextEtyDescrExists || (
                nthTextEtyNameExists && etymologies.every((etymology) =>
                    !etymology?.name?.toLowerCase()?.includes(textEtyNames[n].trim().toLowerCase()) &&
                    !etymology?.description?.toLowerCase()?.includes(textEtyNames[n].trim().toLowerCase())
                )
            ),
            nthTextEtyName = nthTextEtyNameExists ? textEtyNames[n] : undefined,
            nthTextEtyDescr = nthTextEtyDescrExists ? textEtyDescrs[n] : undefined;
        debugLog("showEtymologies: showing text etymology? ", {
            n, nthTextEtyNameExists, nthTextEtyName, nthTextEtyDescrExists, nthTextEtyDescr, textEtyShouldBeShown, etymologies
        });
        if (textEtyShouldBeShown) {
            etymologies_container.appendChild(etymologyToDomElement({
                name: nthTextEtyName,
                description: nthTextEtyDescr,
                from_osm: true,
                from_osm_type: properties.osm_type,
                from_osm_id: properties.osm_id,
            }, currentZoom));
        }
    }

    etymologies_container.querySelector<HTMLDivElement>(".etymology_loading")?.classList.add("hiddenElement");
}

async function downloadEtymologyDetails(etymologies: Etymology[], maxItems = 100): Promise<Etymology[]> {
    let etymologyIDs = etymologies.map(e => e?.wikidata).filter(x => !!x) as string[];

    if (etymologyIDs.length == 0)
        return etymologies;

    if (etymologyIDs.length > maxItems) {
        // Too many items, limiting to the first N entities with the shortest Wikidata Q-ID (which usually means most famous)
        etymologyIDs = etymologyIDs.sort((a, b) => a.length - b.length).slice(0, maxItems);
        loadTranslator().then(t => showSnackbar(
            t("feature_details.loading_first_n_items", { partial: maxItems, total: etymologies.length }),
            "lightsalmon",
            10_000
        ));
    }

    try {
        const downlodedEtymologies = await new WikidataService().fetchEtymologyDetails(etymologyIDs);
        return downlodedEtymologies.map(
            (details: EtymologyDetails): Etymology => ({
                ...etymologies.find(oldEty => oldEty.wikidata == details.wikidata),
                ...details
            })
        );
    } catch (err) {
        console.error("Failed downloading etymology details", etymologyIDs, err);
        return etymologies;
    }
}
