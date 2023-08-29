import { GeoJSONFeature } from 'maplibre-gl';

// import { MapboxGeoJSONFeature as GeoJSONFeature } from 'mapbox-gl';

import { Point, LineString, Polygon, MultiPolygon } from "geojson";
import { etymologyToDomElement } from "./EtymologyElement";
import { debug, getConfig } from "./config";
import { translateContent, translateAnchorTitle, loadTranslator } from "./i18n";
import { showLoadingSpinner, showSnackbar } from "./snackbar";
import { WikidataService } from "./services/WikidataService";
import { imageToDomElement } from "./ImageElement";
import { logErrorMessage } from "./monitoring";
import { EtymologyDetails } from './feature.model';
import { Etymology, EtymologyFeatureProperties } from './generated/owmf';
import { setFragmentParams } from './fragment';

export function featureToDomElement(feature: GeoJSONFeature, currentZoom = 12.5): HTMLElement {
    const detail_template = document.getElementById('detail_template');
    if (!(detail_template instanceof HTMLTemplateElement))
        throw new Error("Missing etymology template");

    const properties = feature.properties as EtymologyFeatureProperties,
        etymologies = typeof properties?.etymologies === 'string' ? JSON.parse(properties?.etymologies) as EtymologyDetails[] : properties?.etymologies,
        detail_container = detail_template.content.cloneNode(true) as HTMLElement,
        osm_full_id = properties.osm_type && properties.osm_id ? properties.osm_type + '/' + properties.osm_id : null;
    //detail_container.dataset.el_id = properties.el_id?.toString();

    if (debug) console.info("featureToDomElement", {
        el_id: properties.el_id, feature, etymologies, detail_container
    });

    translateContent(detail_container, ".i18n_loading", "feature_details.loading");
    translateContent(detail_container, ".i18n_report_problem", "feature_details.report_problem");
    translateAnchorTitle(detail_container, ".title_i18n_report_problem", "feature_details.report_problem");
    translateContent(detail_container, ".i18n_location", "feature_details.location");
    translateAnchorTitle(detail_container, ".title_i18n_location", "feature_details.location");
    translateContent(detail_container, ".i18n_source", "etymology_details.source");

    const element_name = detail_container.querySelector<HTMLElement>('.element_name');
    if (!element_name) {
        if (debug) console.info("Missing element_name");
    } else if (properties.name && properties.name != 'null') {
        element_name.innerText = '📍 ' + properties.name;
    }

    const element_alt_names = detail_container.querySelector<HTMLElement>('.element_alt_names'),
        alt_names = [properties.official_name, properties.alt_name].flatMap(name => name?.split(";")).filter(
            name => name && name !== 'null' && name !== properties.name
        );
    if (!element_alt_names) {
        if (debug) console.info("Missing element_alt_names");
    } else if (alt_names.length > 0) {
        element_alt_names.innerText =
            "(" + alt_names.map(name => `"${name}"`).join(" / ") + ")";
    }

    const element_description = detail_container.querySelector<HTMLElement>('.element_description');
    if (!element_description) {
        if (debug) console.info("Missing element_description");
    } else if (properties.description) {
        element_description.innerText = properties.description;
    }

    const wikidata = properties.wikidata,
        has_wikidata = wikidata && wikidata !== 'null',
        commons = properties.commons,
        has_commons = commons && commons !== 'null',
        picture = properties.picture,
        has_picture = picture && picture !== 'null',
        feature_pictures = detail_container.querySelector<HTMLDivElement>('.feature_pictures');
    if (!feature_pictures) {
        if (debug) console.info("Missing pictures element");
    } else if (has_picture) {
        if (debug) console.info("Using picture from feature 'picture' property", { picture });
        feature_pictures.appendChild(imageToDomElement(picture))
        feature_pictures.classList.remove("hiddenElement");
    } else if (commons?.includes("File:")) {
        if (debug) console.info("Using picture from feature 'commons' property", { commons });
        feature_pictures.appendChild(imageToDomElement(commons));
        feature_pictures.classList.remove("hiddenElement");
    } else if (has_wikidata) {
        if (debug) console.info("Using picture from feature 'wikidata' property", { wikidata });
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
        if (debug) console.info("Missing element_wikidata_button");
    } else if (has_wikidata) {
        element_wikidata_button.href = `https://www.wikidata.org/wiki/${wikidata}`;
        element_wikidata_button.classList.remove("hiddenElement");
    } else {
        element_wikidata_button.classList.add("hiddenElement");
    }

    const wikipedia = properties.wikipedia,
        has_wikipedia = wikipedia && wikipedia !== 'null',
        element_wikipedia_button = detail_container.querySelector<HTMLAnchorElement>('.element_wikipedia_button');
    if (!element_wikipedia_button) {
        if (debug) console.info("Missing element_wikipedia_button");
    } else if (has_wikipedia) {
        element_wikipedia_button.href = wikipedia.startsWith("http") ? wikipedia : `https://www.wikipedia.org/wiki/${wikipedia}`;
        element_wikipedia_button.classList.remove("hiddenElement");
    } else {
        element_wikipedia_button.classList.add("hiddenElement");
    }

    const element_commons_button = detail_container.querySelector<HTMLAnchorElement>('.element_commons_button');
    if (!element_commons_button) {
        if (debug) console.info("Missing element_commons_button");
    } else if (has_commons) {
        if (commons.startsWith("http"))
            element_commons_button.href = commons;
        else if (commons.startsWith("Category:"))
            element_commons_button.href = `https://commons.wikimedia.org/wiki/${commons}`;
        else
            element_commons_button.href = `https://commons.wikimedia.org/wiki/Category:${commons}`;
        element_commons_button.classList.remove("hiddenElement");
    } else {
        element_commons_button.classList.add("hiddenElement");
    }

    const element_osm_button = detail_container.querySelector<HTMLAnchorElement>('.element_osm_button');
    if (!element_osm_button) {
        if (debug) console.info("Missing element_osm_button");
    } else if (osm_full_id) {
        element_osm_button.href = 'https://www.openstreetmap.org/' + osm_full_id;
        element_osm_button.classList.remove("hiddenElement");
    } else {
        element_osm_button.classList.add("hiddenElement");
    }

    let coord = (feature.geometry as Point | LineString | Polygon | MultiPolygon).coordinates;
    while (Array.isArray(coord) && Array.isArray(coord[0])) {
        coord = coord[0];
    }
    const lon = typeof coord[0] === "number" ? coord[0] : undefined,
        lat = typeof coord[1] === "number" ? coord[1] : undefined;

    const element_matcher_button = detail_container.querySelector<HTMLAnchorElement>('.element_matcher_button'),
        show_osm_matcher = osm_full_id && !properties.wikidata && lat !== undefined && lon !== undefined,
        show_wd_matcher = properties.wikidata && !osm_full_id;
    if (!element_matcher_button) {
        if (debug) console.info("Missing element_matcher_button");
    } else if (show_osm_matcher) {
        element_matcher_button.href = `https://map.osm.wikidata.link/map/18/${lat}/${lon}`;
        element_matcher_button.classList.remove("hiddenElement");
    } else if (show_wd_matcher) {
        element_matcher_button.href = `https://map.osm.wikidata.link/item/${properties.wikidata}`;
        element_matcher_button.classList.remove("hiddenElement");
    } else {
        element_matcher_button.classList.add("hiddenElement");
    }

    const mapcomplete_theme = getConfig("mapcomplete_theme"),
        element_mapcomplete_button = detail_container.querySelector<HTMLAnchorElement>('.element_mapcomplete_button'),
        show_mapcomplete = osm_full_id && mapcomplete_theme && lat !== undefined && lon !== undefined;
    if (!element_mapcomplete_button) {
        if (debug) console.info("Missing element_mapcomplete_button");
    } else if (show_mapcomplete) {
        element_mapcomplete_button.href = `https://mapcomplete.org/${mapcomplete_theme}?z=18&lat=${lat}&lon=${lon}#${osm_full_id}`;
        element_mapcomplete_button.classList.remove("hiddenElement");
    } else {
        element_mapcomplete_button.classList.add("hiddenElement");
    }

    const element_location_button = detail_container.querySelector<HTMLAnchorElement>('.element_location_button'),
        show_location = show_mapcomplete || show_osm_matcher || show_wd_matcher || osm_full_id || has_wikidata || has_commons || has_wikipedia;
    if (!element_location_button) {
        if (debug) console.info("Missing element_location_button");
    } else if (show_location) { // Hide this button if it's the only one
        element_location_button.addEventListener("click", () => {
            setFragmentParams(lon, lat, currentZoom + 1);
            return false;
        });
        element_location_button.classList.remove("hiddenElement");
    } else {
        element_location_button.classList.add("hiddenElement");
    }

    const etymologies_container = detail_container.querySelector<HTMLElement>('.etymologies_container');
    if (!etymologies_container) {
        if (debug) console.info("Missing etymologies_container");
    } else {
        const placeholder = etymologies_container.querySelector<HTMLDivElement>(".etymology_loading");
        showLoadingSpinner(true);
        downloadEtymologyDetails(etymologies).then(filledEtymologies => {
            showEtymologies(properties, filledEtymologies, etymologies_container, currentZoom);
            placeholder?.classList.add("hiddenElement");
            showLoadingSpinner(false);
        });
    }

    const src_osm = detail_container.querySelector<HTMLAnchorElement>('.feature_src_osm');
    if (!src_osm) {
        console.warn("Missing .feature_src_osm");
    } else if (properties.from_osm && properties.osm_type && properties.osm_id) {
        const osmURL = `https://www.openstreetmap.org/${properties.osm_type}/${properties.osm_id}`;
        if (debug) console.info("Showing OSM feature source", { properties, osmURL, src_osm });
        src_osm.href = osmURL;
        src_osm.classList.remove('hiddenElement');
    } else {
        src_osm.classList.add('hiddenElement');
    }

    const src_wd = detail_container.querySelector<HTMLAnchorElement>('.feature_src_wd');
    if (!src_wd) {
        console.warn("Missing .feature_src_wd");
    } else if (properties.from_wikidata && properties.wikidata) {
        const wdURL = `https://www.wikidata.org/wiki/${properties.wikidata}`;
        if (debug) console.info("Showing WD feature source", { properties, wdURL, src_wd });
        src_wd.href = wdURL;
        src_wd.classList.remove("hiddenElement");
    } else {
        src_wd.classList.add("hiddenElement");
    }

    return detail_container;
}

function showEtymologies(properties: EtymologyFeatureProperties, etymologies: EtymologyDetails[], etymologies_container: HTMLElement, currentZoom: number) {
    // Sort entities by Wikidata Q-ID length (shortest ID usually means most famous)
    etymologies.sort((a, b) => (a.wikidata?.length || 0) - (b.wikidata?.length || 0)).forEach((ety) => {
        if (ety?.wikidata) {
            try {
                etymologies_container.appendChild(etymologyToDomElement(ety, currentZoom))
            } catch (err) {
                console.error("Failed adding etymology", { properties, ety, err });
            }
        } else if (debug) {
            console.warn("Found etymology without Wikidata ID", { properties, ety });
        }
    });

    const textEtyName = properties.text_etymology === "null" ? undefined : properties.text_etymology,
        textEtyNameExists = typeof textEtyName === "string" && !!textEtyName,
        textEtyNames = textEtyNameExists ? textEtyName.split(";") : [],
        textEtyDescr = properties.text_etymology_descr === "null" ? undefined : properties.text_etymology_descr,
        textEtyDescrExists = typeof textEtyDescr === "string" && !!textEtyDescr,
        textEtyDescrs = textEtyDescrExists ? textEtyDescr.split(";") : [];
    if (debug) console.info("showEtymologies: text etymology", { textEtyName, textEtyNameExists, textEtyNames, textEtyDescr, textEtyDescrExists, textEtyDescrs });

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
        if (debug) console.info("showEtymologies: showing text etymology? ", {
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
}

async function downloadEtymologyDetails(etymologies?: Etymology[], maxItems = 100): Promise<Etymology[]> {
    if (!etymologies?.length)
        return [];

    let etymologyIDs = etymologies.map(e => e.wikidata).filter(x => !!x) as string[];
    if (etymologyIDs.length == 0)
        return etymologies;

    // De-duplicate and sort by ascending Q-ID length (shortest usually means most famous)
    etymologyIDs = [...new Set(etymologyIDs)].sort((a, b) => a.length - b.length);
    if (etymologyIDs.length > maxItems) {
        // Too many items, limiting to the first N most famous ones
        etymologyIDs = etymologyIDs.slice(0, maxItems);
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
