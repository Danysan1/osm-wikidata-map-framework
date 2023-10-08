import { GeoJSONFeature } from 'maplibre-gl';

// import { MapboxGeoJSONFeature as GeoJSONFeature } from 'mapbox-gl';

import { etymologyToDomElement } from "./EtymologyElement";
import { debug } from "../config";
import { translateContent, translateAnchorTitle, loadTranslator } from "../i18n";
import { showLoadingSpinner, showSnackbar } from "../snackbar";
import { WikidataService } from "../services/WikidataService";
import { imageToDomElement } from "./CommonsImageElement";
import { logErrorMessage } from "../monitoring";
import { EtymologyDetails } from '../feature.model';
import { Etymology, EtymologyFeatureProperties } from '../generated/owmf';
import { featureToButtonsDomElement } from './FeatureButtonsElement';

export class FeatureElement extends HTMLDivElement {
    private _currentZoom = 12.5;
    private _feature?: GeoJSONFeature;

    constructor() {
        super();
        this.classList.add('feature-container', 'hiddenElement', 'custom-component');
    }

    get currentZoom(): number {
        return this._currentZoom;
    }

    set currentZoom(currentZoom: number) {
        this._currentZoom = currentZoom;
        if (debug) console.info("FeatureElement: setting currentZoom", { currentZoom });
        this.render();
    }

    get feature(): GeoJSONFeature | undefined {
        return this._feature;
    }

    set feature(feature: GeoJSONFeature | undefined) {
        if (!feature) {
            this._feature = undefined;
            if (debug) console.info("FeatureElement: unsetting feature");
        } else {
            this._feature = feature;
            if (debug) console.info("FeatureElement: setting feature", { feature });
        }
        this.render();
    }

    private render() {
        if (!this.feature) {
            this.classList.add("hiddenElement");
            this.innerHTML = "";
            return;
        }

        const detail_template = document.getElementById('detail_template');
        if (!(detail_template instanceof HTMLTemplateElement))
            throw new Error("Missing etymology template");

        const properties = this.feature.properties as EtymologyFeatureProperties,
            etymologies = typeof properties?.etymologies === 'string' ? JSON.parse(properties?.etymologies) as EtymologyDetails[] : properties?.etymologies,
            detail_container = detail_template.content.cloneNode(true) as HTMLElement,
            osm_full_id = properties.osm_type && properties.osm_id ? properties.osm_type + '/' + properties.osm_id : null;
        //detail_container.dataset.el_id = properties.el_id?.toString();

        if (debug) console.info("FeatureElement render", {
            el_id: properties.el_id, feature: this.feature, etymologies, detail_container
        });

        translateContent(detail_container, ".i18n_loading", "feature_details.loading", "Loading entities...");
        translateContent(detail_container, ".i18n_report_problem", "feature_details.report_problem", "Report a problem in this element");
        translateAnchorTitle(detail_container, ".title_i18n_report_problem", "feature_details.report_problem", "Report a problem in this element");
        translateContent(detail_container, ".i18n_source", "feature_details.source", "Source:");

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

        const buttons_placeholder = detail_container.querySelector<HTMLDivElement>('.feature_buttons_placeholder');
        buttons_placeholder?.replaceWith(featureToButtonsDomElement(this.feature, this.currentZoom + 2));

        const etymologies_container = detail_container.querySelector<HTMLElement>('.etymologies_container');
        if (!etymologies_container) {
            if (debug) console.info("Missing etymologies_container");
        } else {
            const placeholder = etymologies_container.querySelector<HTMLDivElement>(".etymology_loading");
            showLoadingSpinner(true);
            this.downloadEtymologyDetails(etymologies).then(filledEtymologies => {
                this.showEtymologies(properties, filledEtymologies, etymologies_container, this.currentZoom);
                placeholder?.classList.add("hiddenElement");
                showLoadingSpinner(false);
            });
        }

        const src_osm = detail_container.querySelector<HTMLAnchorElement>('.feature_src_osm'),
            show_src_osm = properties.from_osm && osm_full_id;
        if (!src_osm) {
            console.warn("Missing .feature_src_osm");
        } else if (show_src_osm) {
            const osmURL = `https://www.openstreetmap.org/${osm_full_id}`;
            if (debug) console.info("Showing OSM feature source", { properties, osmURL, src_osm });
            src_osm.href = osmURL;
            src_osm.classList.remove('hiddenElement');
        } else {
            src_osm.classList.add('hiddenElement');
        }

        const src_osm_and_wd = detail_container.querySelector<HTMLAnchorElement>('.src_osm_and_wd'),
            src_wd = detail_container.querySelector<HTMLAnchorElement>('.feature_src_wd'),
            show_src_wd = properties.from_wikidata && properties.from_wikidata_entity;
        if (!src_osm_and_wd)
            console.warn("Missing .src_osm_and_wd");
        else if (show_src_osm && show_src_wd)
            src_osm_and_wd.classList.remove("hiddenElement");
        else
            src_osm_and_wd.classList.add("hiddenElement");

        if (!src_wd) {
            console.warn("Missing .feature_src_wd");
        } else if (show_src_wd) {
            const wdURL = `https://www.wikidata.org/wiki/${properties.from_wikidata_entity}#${properties.from_wikidata_prop || "P625"}`;
            if (debug) console.info("Showing WD feature source", { properties, wdURL, src_wd });
            src_wd.href = wdURL;
            src_wd.classList.remove("hiddenElement");
        } else {
            src_wd.classList.add("hiddenElement");
        }

        this.innerHTML = "";
        if (debug) console.info("FeatureElement: rendering", { detail_container });
        this.appendChild(detail_container);
        this.classList.remove("hiddenElement");
    }

    private showEtymologies(properties: EtymologyFeatureProperties, etymologies: EtymologyDetails[], etymologies_container: HTMLElement, currentZoom: number) {
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

    private async downloadEtymologyDetails(etymologies?: Etymology[], maxItems = 100): Promise<Etymology[]> {
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
                t("feature_details.loading_first_n_items", `Loading only first ${maxItems} items`, { partial: maxItems, total: etymologies.length }),
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
}

customElements.define('owmf-feature-element', FeatureElement, { extends: 'div' });

export function featureToDomElement(feature: GeoJSONFeature, currentZoom = 12.5): FeatureElement {
    const element = document.createElement("div", { is: 'owmf-feature-element' }) as FeatureElement;
    element.currentZoom = currentZoom;
    element.feature = feature;
    return element;
}
