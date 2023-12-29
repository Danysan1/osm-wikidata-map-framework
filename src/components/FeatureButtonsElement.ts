import type { Position } from "geojson";
import { debug, getConfig } from "../config";
import { translateContent, translateAnchorTitle } from "../i18n";
import type { EtymologyDetails } from '../model/EtymologyDetails';
import { setFragmentParams } from '../fragment';
import type { EtymologyFeature } from "../model/EtymologyResponse";

export class FeatureButtonsElement extends HTMLDivElement {
    private _destinationZoom = 12;
    private _feature?: EtymologyFeature;

    constructor() {
        super();
        this.classList.add('feature_buttons_container', 'hiddenElement', 'custom-component');
    }

    get destinationZoomLevel(): number {
        return this._destinationZoom;
    }

    set destinationZoomLevel(destinationZoomLevel: number) {
        this._destinationZoom = destinationZoomLevel;
        // if (debug) console.info("FeatureButtonsElement: setting destinationZoomLevel", { destinationZoomLevel });
        this.render();
    }

    get feature(): EtymologyFeature | undefined {
        return this._feature;
    }

    set feature(feature: EtymologyFeature | undefined) {
        if (!feature) {
            this._feature = undefined;
            // if (debug) console.info("FeatureButtonsElement: unsetting feature");
        } else {
            this._feature = feature;
            // if (debug) console.info("FeatureButtonsElement: setting feature", { feature });
        }
        this.render();
    }

    private render() {
        if (!this.feature) {
            this.classList.add("hiddenElement");
            this.innerHTML = "";
            return;
        }

        const feature_buttons_template = document.getElementById('feature_buttons_template');
        if (!(feature_buttons_template instanceof HTMLTemplateElement))
            throw new Error("Missing feature buttons template");

        const properties = this.feature.properties,
            etymologies: EtymologyDetails[] | undefined = typeof properties?.etymologies === 'string' ? JSON.parse(properties.etymologies) : properties?.etymologies,
            detail_container = feature_buttons_template.content.cloneNode(true) as HTMLElement,
            osm_full_id = properties?.osm_type && properties?.osm_id ? properties.osm_type + '/' + properties.osm_id : null;

        if (debug) console.info("FeatureButtonsElement render", {
            el_id: properties?.el_id, feature: this.feature, etymologies, detail_container
        });

        translateContent(detail_container, ".i18n_location", "feature_details.location", "Location");
        translateAnchorTitle(detail_container, ".title_i18n_location", "feature_details.location", "Location");

        const wikidata = properties?.wikidata,
            has_wikidata = wikidata && wikidata !== 'null',
            commons = properties?.commons,
            element_wikidata_button = detail_container.querySelector<HTMLAnchorElement>('.element_wikidata_button');
        if (!element_wikidata_button) {
            if (debug) console.info("Missing element_wikidata_button");
        } else if (has_wikidata) {
            element_wikidata_button.href = `https://www.wikidata.org/wiki/${wikidata}`;
            element_wikidata_button.classList.remove("hiddenElement");
        } else {
            element_wikidata_button.classList.add("hiddenElement");
        }

        const wikipedia = properties?.wikipedia,
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

        const element_commons_button = detail_container.querySelector<HTMLAnchorElement>('.element_commons_button'),
            isURL = commons?.startsWith("http");
        if (!element_commons_button) {
            if (debug) console.info("Missing element_commons_button");
        } else if (isURL && commons?.includes("Category:")) {
            element_commons_button.href = commons;
            element_commons_button.classList.remove("hiddenElement");
        } else if (commons?.startsWith("Category:")) {
            element_commons_button.href = `https://commons.wikimedia.org/wiki/${commons}`;
            element_commons_button.classList.remove("hiddenElement");
        } else if (commons && !isURL && !commons?.includes("File:")) {
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

        let pos: Position | undefined;
        if (this.feature.geometry.type === "Point") {
            pos = this.feature.geometry.coordinates;
        } else if (this.feature.geometry.type === "LineString") {
            pos = this.feature.geometry.coordinates[0];
        } else if (this.feature.geometry.type === "Polygon") {
            pos = this.feature.geometry.coordinates[0][0];
        } else if (this.feature.geometry.type === "MultiPolygon") {
            pos = this.feature.geometry.coordinates[0][0][0];
        }
        const lon = pos?.at(0),
            lat = pos?.at(1);

        const element_matcher_button = detail_container.querySelector<HTMLAnchorElement>('.element_matcher_button'),
            show_osm_matcher = osm_full_id && !properties?.wikidata && lat !== undefined && lon !== undefined,
            show_wd_matcher = properties?.wikidata && !osm_full_id;
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

        const element_id_button = detail_container.querySelector<HTMLAnchorElement>('.element_id_button');
        if (!element_id_button) {
            if (debug) console.info("Missing element_id_button");
        } else if (properties?.osm_type && properties?.osm_id) {
            element_id_button.href = `https://www.openstreetmap.org/edit?editor=id&${properties.osm_type}=${properties.osm_id}`;
            element_id_button.classList.remove("hiddenElement");
        } else {
            element_id_button.classList.add("hiddenElement");
        }

        const element_location_button = detail_container.querySelector<HTMLAnchorElement>('.element_location_button');
        if (!element_location_button) {
            if (debug) console.info("Missing element_location_button");
        } else {
            element_location_button.addEventListener("click", () => {
                setFragmentParams(lon, lat, this.destinationZoomLevel);
                return false;
            });
            element_location_button.classList.remove("hiddenElement");
        }

        this.innerHTML = "";
        // if (debug) console.info("FeatureButtonsElement: rendering", { detail_container });
        this.appendChild(detail_container);
        this.classList.remove("hiddenElement");
    }
}

customElements.define('owmf-feature-buttons-element', FeatureButtonsElement, { extends: 'div' });

export function featureToButtonsDomElement(feature: EtymologyFeature, destinationZoomLevel: number): FeatureButtonsElement {
    const element = document.createElement("div", { is: 'owmf-feature-buttons-element' }) as FeatureButtonsElement;
    element.destinationZoomLevel = destinationZoomLevel;
    element.feature = feature;
    return element;
}
