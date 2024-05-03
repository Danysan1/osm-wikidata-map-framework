import { getConfig, getBoolConfig } from '../config';
import { DropdownControl, DropdownItem } from './DropdownControl';
import { getCorrectFragmentParams, setFragmentParams } from '../fragment';
import type { TFunction } from "i18next";
import { logErrorMessage } from '../monitoring';
import { osmKeyToKeyID } from '../model/EtymologyResponse';
import { MapDatabase } from '../db/MapDatabase';
import { DetailsDatabase } from '../db/DetailsDatabase';
import { StatsDatabase } from '../db/StatsDatabase';
import { showSnackbar } from '../snackbar';
import type { Map } from 'maplibre-gl';
import { translateAnchorTitle, translateContent } from '../i18n';
import { SourcePreset } from '../model/SourcePreset';

const PMTILES_GROUP_NAME = "Database (PMTiles)",
    OVERPASS_GROUP_NAME = "OpenStreetMap (Overpass API)",
    WDQS_GROUP_NAME = "Wikidata Query Service",
    OVERPASS_WDQS_GROUP_NAME = "OSM (Overpass API) + Wikidata Query Service",
    QLEVER_GROUP_NAME = "QLever (beta)";

/**
 * Let the user choose the map style.
 * 
 * @see https://docs.mapbox.com/mapbox-gl-js/example/toggle-layers/
 **/
export class BackEndControl extends DropdownControl {
    constructor(
        source: SourcePreset, startBackEndID: string, onBackEndChange: (backEndID: string) => void, t: TFunction
    ) {
        const propagationEnabled = getBoolConfig("propagate_data"),
            qleverEnabled = getBoolConfig("qlever_enable"),
            pmtilesURL = getConfig("pmtiles_base_url"),
            dropdownItems: DropdownItem[] = [],
            selectBackEnd = (backEndID: string) => {
                if (process.env.NODE_ENV === 'development') console.debug("Selecting source ", { backEndID });

                // If the change came from a manual interaction, update the fragment params
                setFragmentParams(undefined, undefined, undefined, undefined, backEndID);

                // If the change came from a fragment change, update the dropdown
                // Regardless of the source, update the map
                onBackEndChange(backEndID);
            },
            buildDropdownItem = (backEndID: string, text: string, category?: string): DropdownItem => ({
                id: backEndID,
                text: text,
                category: category,
                onSelect: () => {
                    selectBackEnd(backEndID);

                    // Hide the dropdown to leave more space for the map
                    this.showDropdown(false);
                }
            });

        if (pmtilesURL)
            dropdownItems.push(buildDropdownItem("pmtiles_all", t("source.db_all", "All sources from DB"), PMTILES_GROUP_NAME));

        const allKeysText = t("source.all_osm_keys", "All OSM keys");
        if (source.osm_wikidata_keys?.length)
            dropdownItems.push(buildDropdownItem("overpass_all", allKeysText, OVERPASS_GROUP_NAME));

        if (source.osm_wikidata_properties?.length) {
            /**
             * @example "Wikidata P138/P825/P547"
             */
            const wikidataDirectText = "Wikidata " + source.osm_wikidata_properties.join("/");
            /**
             * @example "OSM wikidata=* > Wikidata P138/P825/P547"
             */
            const osmWikidataDirectText = `OSM wikidata=* > ${wikidataDirectText}`;
            if (pmtilesURL) {
                dropdownItems.push(buildDropdownItem("pmtiles_osm_wikidata_direct", osmWikidataDirectText, PMTILES_GROUP_NAME));
                dropdownItems.push(buildDropdownItem("pmtiles_wd_direct", wikidataDirectText, PMTILES_GROUP_NAME));
            }
            if (source.osm_wikidata_keys?.length)
                dropdownItems.push(buildDropdownItem("overpass_all_wd+wd_direct", `${allKeysText} + ${wikidataDirectText}`, OVERPASS_WDQS_GROUP_NAME));

            dropdownItems.push(buildDropdownItem("overpass_wd+wd_direct", osmWikidataDirectText, OVERPASS_WDQS_GROUP_NAME));
            dropdownItems.push(buildDropdownItem("wd_direct", wikidataDirectText, WDQS_GROUP_NAME));
            if (qleverEnabled) {
                dropdownItems.push(buildDropdownItem("qlever_wd_direct", `${wikidataDirectText} (beta)`, QLEVER_GROUP_NAME));
                dropdownItems.push(buildDropdownItem("qlever_osm_wikidata_direct", `${osmWikidataDirectText} (beta)`, QLEVER_GROUP_NAME));
                //dropdownItems.push(buildDropdownItem("qlever_osm_all_wd_direct", `${allKeysText} + ${wikidataDirectText} (beta)`, QLEVER_GROUP_NAME)); // TODO: implement and enable
            }
        }

        if (source.wikidata_indirect_property) {
            const indirectText = t("source.wd_indirect", "P625 qualifiers on {{indirectWdProperty}} and Wikidata entities referenced with {{indirectWdProperty}}", { indirectWdProperty:source.wikidata_indirect_property }),
                qualifierText = t("source.wd_qualifier", "P625 qualifiers on {{indirectWdProperty}}", { indirectWdProperty:source.wikidata_indirect_property }),
                reverseText = t("source.wd_reverse", "Wikidata entities referenced with {{indirectWdProperty}}", { indirectWdProperty:source.wikidata_indirect_property });

            if (source.osm_wikidata_keys?.length) {
                dropdownItems.push(buildDropdownItem("overpass_all_wd+wd_indirect", `${allKeysText} + ${indirectText}`, OVERPASS_WDQS_GROUP_NAME));
                dropdownItems.push(buildDropdownItem("overpass_all_wd+wd_qualifier", `${allKeysText} + ${qualifierText}`, OVERPASS_WDQS_GROUP_NAME));
                dropdownItems.push(buildDropdownItem("overpass_all_wd+wd_reverse", `${allKeysText} + ${reverseText}`, OVERPASS_WDQS_GROUP_NAME));
            }
            dropdownItems.push(buildDropdownItem("overpass_wd+wd_indirect", `OSM wikidata=* > ${indirectText}`, OVERPASS_WDQS_GROUP_NAME));
            dropdownItems.push(buildDropdownItem("overpass_wd+wd_reverse", `OSM wikidata=* > ${reverseText}`, OVERPASS_WDQS_GROUP_NAME));

            dropdownItems.push(buildDropdownItem("wd_indirect", indirectText, WDQS_GROUP_NAME));
            dropdownItems.push(buildDropdownItem("wd_qualifier", qualifierText, WDQS_GROUP_NAME));
            dropdownItems.push(buildDropdownItem("wd_reverse", reverseText, WDQS_GROUP_NAME));

            if (qleverEnabled) {
                if (source.osm_wikidata_keys?.length) {
                    // dropdownItems.push(buildDropdownItem("qlever_osm_all_indirect", `${allKeysText} + ${indirectText} (beta)`, QLEVER_GROUP_NAME)); // TODO: implement and enable
                    // dropdownItems.push(buildDropdownItem("qlever_osm_all_qualifier", `${allKeysText} + ${qualifierText} (beta)`, QLEVER_GROUP_NAME)); // TODO: implement and enable
                    // dropdownItems.push(buildDropdownItem("qlever_osm_all_reverse", `${allKeysText} + ${reverseText} (beta)`, QLEVER_GROUP_NAME)); // TODO: implement and enable
                }
                // dropdownItems.push(buildDropdownItem("qlever_osm_wikidata_indirect", `OSM wikidata=* > ${indirectText} (beta)`, QLEVER_GROUP_NAME)); // TODO: implement and enable
                dropdownItems.push(buildDropdownItem("qlever_osm_wikidata_reverse", `OSM wikidata=* > ${reverseText} (beta)`, QLEVER_GROUP_NAME));
                dropdownItems.push(buildDropdownItem("qlever_wd_indirect", `${indirectText} (beta)`, QLEVER_GROUP_NAME));
                dropdownItems.push(buildDropdownItem("qlever_wd_qualifier", `${qualifierText} (beta)`, QLEVER_GROUP_NAME));
                dropdownItems.push(buildDropdownItem("qlever_wd_reverse", `${reverseText} (beta)`, QLEVER_GROUP_NAME));
            }
        }

        if (source.osm_wikidata_keys?.length && qleverEnabled)
            dropdownItems.push(buildDropdownItem("qlever_osm_all", `${allKeysText} (beta)`, QLEVER_GROUP_NAME));

        source.osm_wikidata_keys?.forEach(key => {
            const keyID = osmKeyToKeyID(key),
                keyText = "OSM " + key;
            dropdownItems.push(buildDropdownItem("overpass_" + keyID, keyText, OVERPASS_GROUP_NAME));
            if (pmtilesURL)
                dropdownItems.push(buildDropdownItem("pmtiles_" + keyID, keyText, PMTILES_GROUP_NAME));
            if (qleverEnabled)
                dropdownItems.push(buildDropdownItem("qlever_" + keyID, `${keyText} (beta)`, QLEVER_GROUP_NAME));
        });

        if (!source.osm_wikidata_keys?.length && !source.osm_wikidata_properties?.length && !source.wikidata_indirect_property && !source.osm_text_key) {
            dropdownItems.push(buildDropdownItem("overpass_wd+wd_base", "OSM wikidata=* + Wikidata P625", OVERPASS_WDQS_GROUP_NAME));
            dropdownItems.push(buildDropdownItem("overpass_wd", "OSM wikidata=*", OVERPASS_GROUP_NAME));
            dropdownItems.push(buildDropdownItem("wd_base", "Wikidata P625", WDQS_GROUP_NAME));
            if (qleverEnabled) {
                dropdownItems.push(buildDropdownItem("qlever_osm_wd_base", "OSM wikidata=* + Wikidata P625 (beta)", QLEVER_GROUP_NAME));
                dropdownItems.push(buildDropdownItem("qlever_osm_wd", "OSM wikidata=* (beta)", QLEVER_GROUP_NAME));
                dropdownItems.push(buildDropdownItem("qlever_wd_base", "Wikidata P625 (beta)", QLEVER_GROUP_NAME));
            }
        }

        if (propagationEnabled && pmtilesURL)
            dropdownItems.push(buildDropdownItem("pmtiles_propagated", t("source.propagated", "Propagated"), PMTILES_GROUP_NAME));

        if (dropdownItems.find(item => item.id === startBackEndID)) {
            if (process.env.NODE_ENV === 'development') console.debug("Starting with back-end ID", startBackEndID);
        } else {
            logErrorMessage("Invalid start back-end ID", "warning", { oldID: startBackEndID, dropdownItems, newID: dropdownItems[0].id });
            startBackEndID = dropdownItems[0].id;
            selectBackEnd(startBackEndID);
        }

        super(
            '⚙️',
            dropdownItems,
            startBackEndID,
            "source.choose_source",
            true,
            undefined,
            () => this.value = getCorrectFragmentParams().backEndID
        );
    }

    override onAdd(map: Map) {
        const out = super.onAdd(map);

        const table = this.getContainer()?.querySelector<HTMLTableElement>("table");
        if (!table)
            throw new Error("Missing container");

        const tr = document.createElement("tr");
        table.appendChild(tr);

        const td = document.createElement("td");
        td.colSpan = 2;
        tr.appendChild(td);

        const clearCacheButton = document.createElement("a");
        clearCacheButton.role = "button";
        clearCacheButton.onclick = this.clearCache;
        clearCacheButton.className = "hiddenElement k-button w3-button w3-white w3-border w3-round-large button-6 clear_cache_button";
        td.appendChild(clearCacheButton);
        translateAnchorTitle(td, ".clear_cache_button", "clear_cache", "Clear cache");

        const img = document.createElement("span"),
            text = document.createElement("span");
        img.className = "button_img";
        img.innerHTML = "🗑️ &nbsp;";
        clearCacheButton.appendChild(img);
        text.className = "i18n_clear_cache";
        clearCacheButton.appendChild(text);
        translateContent(td, ".i18n_clear_cache", "clear_cache", "Clear cache");

        return out;
    }

    private clearCache(this: void) {
        if (process.env.NODE_ENV === 'development') console.debug("ClearCacheControl full button click");
        const mapDB = new MapDatabase(),
            detailsDB = new DetailsDatabase(),
            statsDB = new StatsDatabase();
        Promise.all([
            mapDB.transaction("rw", mapDB.tables[0], async () => mapDB.tables[0].clear()),
            detailsDB.transaction("rw", detailsDB.tables[0], async () => detailsDB.tables[0].clear()),
            statsDB.transaction("rw", statsDB.tables[0], async () => statsDB.tables[0].clear())
        ]).then(
            () => showSnackbar("Cache cleared", "lightgreen")
        ).catch(console.error);
    }

    override showDropdown(show?: boolean): void {
        super.showDropdown(show);

        const translateLink = this.getContainer()?.querySelector(".clear_cache_button");
        if (!translateLink)
            throw new Error("Missing clear cache button");

        if (show)
            translateLink.classList.remove("hiddenElement");
        else
            translateLink.classList.add("hiddenElement");
    }
}
