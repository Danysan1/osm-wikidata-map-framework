import type { MapGeoJSONFeature } from 'maplibre-gl';

import { etymologyToDomElement } from "./EtymologyElement";
import { getBoolConfig } from "../config";
import { translateContent, translateAnchorTitle, loadTranslator, getLanguage } from "../i18n";
import { showLoadingSpinner, showSnackbar } from "../snackbar";
import { imageToDomElement } from "./CommonsImageElement";
import { logErrorMessage } from "../monitoring";
import type { EtymologyDetails } from '../model/EtymologyDetails';
import type { EtymologyFeatureProperties } from '../model/EtymologyFeatureProperties';
import type { Etymology } from '../model/Etymology';
import { featureToButtonsDomElement } from './FeatureButtonsElement';
import { WikidataStatementService } from '../services/WikidataStatementService';
import { WikidataLabelService } from '../services/WikidataLabelService';
import { WikidataDescriptionService } from '../services/WikidataDescriptionService';
import { WikidataDetailsService } from '../services/WikidataDetailsService';
import { getEtymologies } from '../services/etymologyUtils';

export class FeatureElement extends HTMLDivElement {
    private _currentZoom = 12.5;
    private _feature?: MapGeoJSONFeature;

    constructor() {
        super();
        this.classList.add('feature-container', 'hiddenElement', 'custom-component');
    }

    get currentZoom(): number {
        return this._currentZoom;
    }

    set currentZoom(currentZoom: number) {
        this._currentZoom = currentZoom;
        if (process.env.NODE_ENV === 'development') console.debug("FeatureElement: setting currentZoom", { currentZoom });
        this.render();
    }

    get feature(): MapGeoJSONFeature | undefined {
        return this._feature;
    }

    set feature(feature: MapGeoJSONFeature | undefined) {
        if (!feature) {
            this._feature = undefined;
            if (process.env.NODE_ENV === 'development') console.debug("FeatureElement: unsetting feature");
        } else {
            this._feature = feature;
            if (process.env.NODE_ENV === 'development') console.debug("FeatureElement: setting feature", { feature });
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

        const properties: EtymologyFeatureProperties = this.feature.properties,
            etymologies = getEtymologies(this.feature),
            detail_container = detail_template.content.cloneNode(true) as HTMLElement,
            osm_full_id = properties.osm_type && properties.osm_id ? properties.osm_type + '/' + properties.osm_id : null;
        //detail_container.dataset.el_id = properties.el_id?.toString();

        if (process.env.NODE_ENV === 'development') console.debug("FeatureElement render", {
            el_id: properties.el_id, feature: this.feature, etymologies, detail_container
        });

        translateContent(detail_container, ".i18n_loading", "feature_details.loading", "Loading entities...");
        translateContent(detail_container, ".i18n_report_problem", "feature_details.report_problem", "Report a problem in this element");
        translateAnchorTitle(detail_container, ".title_i18n_report_problem", "feature_details.report_problem", "Report a problem in this element");
        translateContent(detail_container, ".i18n_source", "feature_details.source", "Source:");

        const wikidata = properties.wikidata,
            has_wikidata = wikidata && wikidata !== 'null',
            element_name = detail_container.querySelector<HTMLElement>('.element_name'),
            local_name = properties["name:" + getLanguage()],
            default_name = properties["name:en"];

        let main_name: string | undefined;
        if (typeof local_name === "string" && local_name !== 'null') {
            main_name = local_name;
        } else if (properties.name && properties.name !== 'null') {
            main_name = properties.name;
        } else if (typeof default_name === "string" && default_name !== 'null') {
            main_name = default_name;
        } else if (properties.official_name && properties.official_name !== 'null') {
            main_name = properties.official_name;
        } else if (properties.alt_name && properties.alt_name !== 'null') {
            main_name = properties.alt_name;
        }

        if (!element_name) {
            if (process.env.NODE_ENV === 'development') console.debug("Missing .element_name");
        } else if (main_name) {
            element_name.innerText = '📍 ' + main_name;
        } else if (has_wikidata) {
            void this.showLabelFromWikidata(wikidata, element_name);
        }

        const element_alt_names = detail_container.querySelector<HTMLElement>('.element_alt_names'),
            alt_names = new Set<string>();
        [properties.name, properties.official_name, properties.alt_name]
            .flatMap(name => name?.split(";"))
            .map(name => name?.trim())
            .filter(name => name && name !== 'null' && (!main_name || name.toLowerCase() !== main_name.toLowerCase()))
            .forEach(name => alt_names.add(name!)); // deduplicates alt names
        if (!element_alt_names) {
            if (process.env.NODE_ENV === 'development') console.debug("Missing .element_alt_names");
        } else if (alt_names.size > 0) {
            element_alt_names.innerText = "(";
            alt_names.forEach(name => element_alt_names.innerText += `"${name}"`);
            element_alt_names.innerText += ")";
        }

        const element_description = detail_container.querySelector<HTMLElement>('.element_description');
        if (!element_description) {
            if (process.env.NODE_ENV === 'development') console.debug("Missing .element_description");
        } else if (properties.description) {
            element_description.innerText = properties.description;
        } else if (has_wikidata) {
            void this.showDescriptionFromWikidata(wikidata, element_description);
        }

        const commons = properties.commons,
            picture = properties.picture,
            has_picture = picture && picture !== 'null',
            feature_pictures = detail_container.querySelector<HTMLDivElement>('.feature_pictures');
        if (!feature_pictures) {
            if (process.env.NODE_ENV === 'development') console.debug("Missing .feature_pictures");
        } else if (has_picture) {
            if (process.env.NODE_ENV === 'development') console.debug("Using picture from feature 'picture' property", { picture });
            feature_pictures.appendChild(imageToDomElement(picture))
            feature_pictures.classList.remove("hiddenElement");
        } else if (commons?.includes("File:")) {
            if (process.env.NODE_ENV === 'development') console.debug("Using picture from feature 'commons' property", { commons });
            feature_pictures.appendChild(imageToDomElement(commons));
            feature_pictures.classList.remove("hiddenElement");
        } else if (has_wikidata) {
            if (process.env.NODE_ENV === 'development') console.debug("Using picture from feature 'wikidata' property", { wikidata });
            void this.showDetailsFromWikidata(wikidata, feature_pictures);
        } else {
            feature_pictures.classList.add("hiddenElement");
        }

        const buttons_placeholder = detail_container.querySelector<HTMLDivElement>('.feature_buttons_placeholder');
        buttons_placeholder?.replaceWith(featureToButtonsDomElement(this.feature, this.currentZoom + 2));

        const etymologies_container = detail_container.querySelector<HTMLElement>('.etymologies_container');
        if (!etymologies_container) {
            if (process.env.NODE_ENV === 'development') console.debug("Missing .etymologies_container");
        } else {
            void this.fetchAndShowEtymologies(properties, etymologies_container, etymologies);
        }

        const src_osm = detail_container.querySelector<HTMLAnchorElement>('.feature_src_osm'),
            show_src_osm = properties.from_osm && osm_full_id;
        if (!src_osm) {
            console.warn("Missing .feature_src_osm");
        } else if (show_src_osm) {
            const osmURL = `https://www.openstreetmap.org/${osm_full_id}`;
            if (process.env.NODE_ENV === 'development') console.debug("Showing OSM feature source", { properties, osmURL, src_osm });
            src_osm.href = osmURL;
            src_osm.classList.remove('hiddenElement');
        } else {
            src_osm.classList.add('hiddenElement');
        }

        const src_osm_and_wd = detail_container.querySelector<HTMLAnchorElement>('.src_osm_and_wd'),
            src_wd = detail_container.querySelector<HTMLAnchorElement>('.feature_src_wd'),
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
            from_entity = properties.from_wikidata_entity || properties.wikidata,
            show_src_wd = properties.from_wikidata && from_entity;
        if (!src_osm_and_wd)
            console.warn("Missing .src_osm_and_wd");
        else if (show_src_osm && show_src_wd)
            src_osm_and_wd.classList.remove("hiddenElement");
        else
            src_osm_and_wd.classList.add("hiddenElement");

        if (!src_wd) {
            console.warn("Missing .feature_src_wd");
        } else if (show_src_wd) {
            const wdURL = `https://www.wikidata.org/wiki/${from_entity}#${properties.from_wikidata_prop ?? "P625"}`;
            if (process.env.NODE_ENV === 'development') console.debug("Showing WD feature source", { properties, wdURL, src_wd });
            src_wd.href = wdURL;
            src_wd.classList.remove("hiddenElement");
        } else {
            src_wd.classList.add("hiddenElement");
        }

        this.innerHTML = "";
        if (process.env.NODE_ENV === 'development') console.debug("FeatureElement: rendering", { detail_container });
        this.appendChild(detail_container);
        this.classList.remove("hiddenElement");
    }

    private async fetchAndShowEtymologies(properties: EtymologyFeatureProperties, etymologies_container: HTMLElement, etymologies?: Etymology[]) {
        const placeholder = etymologies_container.querySelector<HTMLDivElement>(".etymology_loading");
        if (!etymologies) {
            placeholder?.classList.add("hiddenElement");
            return;
        }

        showLoadingSpinner(true);

        const filledEtymologies = await this.downloadEtymologyDetails(etymologies);
        this.showEtymologies(filledEtymologies, etymologies_container, this.currentZoom);
        this.showTextEtymologies(properties, filledEtymologies, etymologies_container);
        placeholder?.classList.add("hiddenElement");

        const parts_containers = etymologies_container.querySelectorAll<HTMLElement>(".etymology_parts_container")
        if (!getBoolConfig("fetch_parts_of_linked_entities") || parts_containers.length == 0) {
            if (process.env.NODE_ENV === 'development') console.debug("fetchAndShowEtymologies: skipping fetching parts of linked entities", { filledEtymologies });
        } else {
            if (process.env.NODE_ENV === 'development') console.debug("fetchAndShowEtymologies: fetching parts of linked entities", { filledEtymologies });
            const parts = filledEtymologies.reduce((acc: Etymology[], ety: Etymology): Etymology[] => {
                if (ety.statementEntity) {
                    acc.push({
                        ...ety,
                        from_statement_of_wikidata_cod: ety.wikidata,
                        wikidata: ety.statementEntity,
                    });
                }
                if (ety.parts) {
                    acc.push(...ety.parts.map(part => ({
                        ...ety,
                        from_parts_of_wikidata_cod: ety.wikidata,
                        wikidata: part
                    })));
                }
                return acc;
            }, []),
                filledParts = await this.downloadEtymologyDetails(parts);

            if (process.env.NODE_ENV === 'development') console.debug("fetchAndShowEtymologies: showing parts of linked entities", { filledParts, parts_containers });
            parts_containers.forEach(parts_container => {
                const wdID = parts_container.dataset.wikidataCod;
                if (wdID) {
                    const partsOfThisEntity = filledParts.filter(ety => ety.from_parts_of_wikidata_cod === wdID || ety.from_statement_of_wikidata_cod === wdID);
                    this.showEtymologies(partsOfThisEntity, parts_container, this.currentZoom);
                    parts_container.classList.remove("hiddenElement");
                }
            });
        }

        showLoadingSpinner(false);
    }

    private async showLabelFromWikidata(wikidataID: string, element_name: HTMLElement) {
        try {
            const labelService = new WikidataLabelService(),
                label = await labelService.getSomeLabelFromWikidataID(wikidataID, getLanguage());
            if (label) {
                if (process.env.NODE_ENV === 'development') console.debug("Found label from Wikidata", { wikidataID, element_name, label });
                element_name.innerText = '📍 ' + label;
            }
        } catch (err) {
            if (process.env.NODE_ENV === 'development') console.warn("Failed getting label from Wikidata", { wikidataID, element_name });
        }
    }

    private async showDescriptionFromWikidata(wikidataID: string, element_name: HTMLElement) {
        try {
            const descriptionService = new WikidataDescriptionService(),
                description = await descriptionService.getDescriptionFromWikidataID(wikidataID, getLanguage());
            if (description) {
                if (process.env.NODE_ENV === 'development') console.debug("Found description from Wikidata", { wikidataID, element_name, description });
                element_name.innerText = description;
            }
        } catch (err) {
            if (process.env.NODE_ENV === 'development') console.warn("Failed getting description from Wikidata", { wikidataID, element_name });
        }
    }

    private async showDetailsFromWikidata(wikidataID: string, feature_pictures: HTMLElement) {
        try {
            const statementService = new WikidataStatementService(),
                image = await statementService.getCommonsImageFromWikidataID(wikidataID);
            if (image) {
                if (process.env.NODE_ENV === 'development') console.debug("Found image from Wikidata", { wikidataID, feature_pictures, image });
                feature_pictures.appendChild(imageToDomElement(image));
                feature_pictures.classList.remove("hiddenElement");
            }
        } catch (err) {
            logErrorMessage("Failed getting image from Wikidata", 'error', { wikidataID, feature_pictures });
            feature_pictures.classList.add("hiddenElement");
        }
    }

    private showEtymologies(etymologies: EtymologyDetails[], etymologies_container: HTMLElement, currentZoom: number) {
        // Sort entities by Wikidata Q-ID length (shortest ID usually means most famous)
        etymologies.sort((a, b) => (a.wikidata?.length ?? 0) - (b.wikidata?.length ?? 0)).forEach((ety) => {
            if (ety?.wikidata) {
                try {
                    etymologies_container.appendChild(etymologyToDomElement(ety, currentZoom))
                } catch (err) {
                    console.error("Failed adding etymology", { ety, err });
                }
            } else if (process.env.NODE_ENV === 'development') {
                console.warn("Found etymology without Wikidata ID", { ety });
            }
        });
    }

    private showTextEtymologies(properties: EtymologyFeatureProperties, etymologies: EtymologyDetails[], etymologies_container: HTMLElement) {
        const textEtyName = properties.text_etymology === "null" ? undefined : properties.text_etymology,
            textEtyNameExists = typeof textEtyName === "string" && !!textEtyName,
            textEtyNames = textEtyNameExists ? textEtyName.split(";") : [],
            textEtyDescr = properties.text_etymology_descr === "null" ? undefined : properties.text_etymology_descr,
            textEtyDescrExists = typeof textEtyDescr === "string" && !!textEtyDescr,
            textEtyDescrs = textEtyDescrExists ? textEtyDescr.split(";") : [];
        if (process.env.NODE_ENV === 'development') console.debug("showEtymologies: text etymology", { textEtyName, textEtyNameExists, textEtyNames, textEtyDescr, textEtyDescrExists, textEtyDescrs });

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
            if (process.env.NODE_ENV === 'development') console.debug("showEtymologies: showing text etymology? ", {
                n, nthTextEtyNameExists, nthTextEtyName, nthTextEtyDescrExists, nthTextEtyDescr, textEtyShouldBeShown, etymologies
            });
            if (textEtyShouldBeShown) {
                etymologies_container.appendChild(etymologyToDomElement({
                    name: nthTextEtyName,
                    description: nthTextEtyDescr,
                    from_osm: true,
                    from_osm_type: properties.osm_type,
                    from_osm_id: properties.osm_id,
                }));
            }
        }
    }

    private async downloadEtymologyDetails(etymologies?: Etymology[], maxItems = 100): Promise<EtymologyDetails[]> {
        if (!etymologies?.length)
            return [];

        // De-duplicate and sort by ascending Q-ID length (shortest usually means most famous)
        let etymologyIDs = new Set(
            etymologies.map(e => e.wikidata ?? "").filter(x => x !== "")
        );
        if (etymologyIDs.size == 0)
            return etymologies;

        let sortedIDs = [...etymologyIDs].sort((a, b) => parseInt(a.replace("Q", "")) - parseInt(b.replace("Q", "")));
        if (etymologyIDs.size > maxItems) {
            // Too many items, limiting to the first N most famous ones
            sortedIDs = sortedIDs.slice(0, maxItems);
            etymologyIDs = new Set(sortedIDs);
            loadTranslator().then(t => showSnackbar(
                t("feature_details.loading_first_n_items", `Loading only first ${maxItems} items`, { partial: maxItems, total: etymologies.length }),
                "lightsalmon",
                10_000
            )).catch(console.error);
        }

        try {
            const detailsService = new WikidataDetailsService(),
                downloadedEtymologies = await detailsService.fetchEtymologyDetails(etymologyIDs);
            return sortedIDs.map((wikidataID): EtymologyDetails => {
                const baseEntity = etymologies.find(oldEty => oldEty.wikidata === wikidataID),
                    downloadedDetails = downloadedEtymologies[wikidataID];
                return { ...baseEntity, ...downloadedDetails };
            });
        } catch (err) {
            console.error("Failed downloading etymology details", etymologyIDs, err);
            return etymologies;
        }
    }
}

customElements.define('owmf-feature-element', FeatureElement, { extends: 'div' });

export function featureToDomElement(feature: MapGeoJSONFeature, currentZoom = 12.5): FeatureElement {
    const element = document.createElement("div", { is: 'owmf-feature-element' }) as FeatureElement;
    element.currentZoom = currentZoom;
    element.feature = feature;
    return element;
}
