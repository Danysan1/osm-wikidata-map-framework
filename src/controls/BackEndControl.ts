import { getConfig, getBoolConfig, getKeyID, getStringArrayConfig } from '../config';
import { DropdownControl, DropdownItem } from './DropdownControl';
import { getCorrectFragmentParams, setFragmentParams } from '../fragment';
import type { TFunction } from "i18next";
import { logErrorMessage } from '../monitoring';

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
        startBackEndID: string, onBackEndChange: (backEndID: string) => void, t: TFunction
    ) {
        const keys = getStringArrayConfig("osm_wikidata_keys"),
            wdDirectProperties = getStringArrayConfig("osm_wikidata_properties"),
            indirectWdProperty = getConfig("wikidata_indirect_property"),
            propagationEnabled = getBoolConfig("propagate_data"),
            qleverEnabled = getBoolConfig("qlever_enable"),
            pmtilesURL = getBoolConfig("pmtiles_base_url"),
            dropdownItems: DropdownItem[] = [],
            osm_text_key = getConfig("osm_text_key"),
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
        if (keys?.length)
            dropdownItems.push(buildDropdownItem("overpass_all", allKeysText, OVERPASS_GROUP_NAME));

        if (wdDirectProperties?.length) {
            const wikidataDirectText = "Wikidata " + wdDirectProperties.join("/"), // Ex: "Wikidata P138/P825/P547"
                osmWikidataDirectText = `OSM wikidata=* + ${wikidataDirectText}`; // Ex: "OSM wikidata=* + Wikidata P138/P825/P547"
            if (pmtilesURL) {
                dropdownItems.push(buildDropdownItem("pmtiles_osm_wikidata_direct", osmWikidataDirectText, PMTILES_GROUP_NAME));
                dropdownItems.push(buildDropdownItem("pmtiles_wd_direct", wikidataDirectText, PMTILES_GROUP_NAME));
            }
            if (keys?.length)
                dropdownItems.push(buildDropdownItem("overpass_all_wd+wd_direct", `${allKeysText} + ${wikidataDirectText}`, OVERPASS_WDQS_GROUP_NAME));

            dropdownItems.push(buildDropdownItem("overpass_wd+wd_direct", osmWikidataDirectText, OVERPASS_WDQS_GROUP_NAME));
            dropdownItems.push(buildDropdownItem("wd_direct", wikidataDirectText, WDQS_GROUP_NAME));
            if (qleverEnabled) {
                dropdownItems.push(buildDropdownItem("qlever_wd_direct", `${wikidataDirectText} (beta)`, QLEVER_GROUP_NAME));
                dropdownItems.push(buildDropdownItem("qlever_osm_wikidata_direct", `${osmWikidataDirectText} (beta)`, QLEVER_GROUP_NAME));
                //dropdownItems.push(buildDropdownItem("qlever_osm_all_wd_direct", `${allKeysText} + ${wikidataDirectText} (beta)`, QLEVER_GROUP_NAME)); // TODO: implement and enable
            }
        }

        if (indirectWdProperty) {
            const indirectText = t("source.wd_indirect", "P625 qualifiers on {{indirectWdProperty}} and Wikidata entities referenced with {{indirectWdProperty}}", { indirectWdProperty }),
                qualifierText = t("source.wd_qualifier", "P625 qualifiers on {{indirectWdProperty}}", { indirectWdProperty }),
                reverseText = t("source.wd_reverse", "Wikidata entities referenced with {{indirectWdProperty}}", { indirectWdProperty });

            if (keys?.length) {
                dropdownItems.push(buildDropdownItem("overpass_all_wd+wd_indirect", `${allKeysText} + ${indirectText}`, OVERPASS_WDQS_GROUP_NAME));
                dropdownItems.push(buildDropdownItem("overpass_all_wd+wd_qualifier", `${allKeysText} + ${qualifierText}`, OVERPASS_WDQS_GROUP_NAME));
                dropdownItems.push(buildDropdownItem("overpass_all_wd+wd_reverse", `${allKeysText} + ${reverseText}`, OVERPASS_WDQS_GROUP_NAME));
            }
            dropdownItems.push(buildDropdownItem("overpass_wd+wd_indirect", `OSM wikidata=* + ${indirectText}`, OVERPASS_WDQS_GROUP_NAME));
            dropdownItems.push(buildDropdownItem("overpass_wd+wd_reverse", `OSM wikidata=* + ${reverseText}`, OVERPASS_WDQS_GROUP_NAME));

            dropdownItems.push(buildDropdownItem("wd_indirect", indirectText, WDQS_GROUP_NAME));
            dropdownItems.push(buildDropdownItem("wd_qualifier", qualifierText, WDQS_GROUP_NAME));
            dropdownItems.push(buildDropdownItem("wd_reverse", reverseText, WDQS_GROUP_NAME));

            if (qleverEnabled) {
                if (keys?.length) {
                    // dropdownItems.push(buildDropdownItem("qlever_osm_all_indirect", `${allKeysText} + ${indirectText} (beta)`, QLEVER_GROUP_NAME)); // TODO: implement and enable
                    // dropdownItems.push(buildDropdownItem("qlever_osm_all_qualifier", `${allKeysText} + ${qualifierText} (beta)`, QLEVER_GROUP_NAME)); // TODO: implement and enable
                    // dropdownItems.push(buildDropdownItem("qlever_osm_all_reverse", `${allKeysText} + ${reverseText} (beta)`, QLEVER_GROUP_NAME)); // TODO: implement and enable
                }
                // dropdownItems.push(buildDropdownItem("qlever_osm_wikidata_indirect", `OSM wikidata=* + ${indirectText} (beta)`, QLEVER_GROUP_NAME)); // TODO: implement and enable
                dropdownItems.push(buildDropdownItem("qlever_osm_wikidata_reverse", `OSM wikidata=* + ${reverseText} (beta)`, QLEVER_GROUP_NAME));
                dropdownItems.push(buildDropdownItem("qlever_wd_indirect", `${indirectText} (beta)`, QLEVER_GROUP_NAME));
                dropdownItems.push(buildDropdownItem("qlever_wd_qualifier", `${qualifierText} (beta)`, QLEVER_GROUP_NAME));
                dropdownItems.push(buildDropdownItem("qlever_wd_reverse", `${reverseText} (beta)`, QLEVER_GROUP_NAME));
            }
        }

        if (keys?.length && qleverEnabled)
            dropdownItems.push(buildDropdownItem("qlever_osm_all", `${allKeysText} (beta)`, QLEVER_GROUP_NAME));

        keys?.forEach(key => {
            const keyID = getKeyID(key),
                keyText = "OSM " + key;
            dropdownItems.push(buildDropdownItem("overpass_" + keyID, keyText, OVERPASS_GROUP_NAME));
            if (pmtilesURL)
                dropdownItems.push(buildDropdownItem("pmtiles_" + keyID, keyText, PMTILES_GROUP_NAME));
            if (qleverEnabled)
                dropdownItems.push(buildDropdownItem("qlever_" + keyID, `${keyText} (beta)`, QLEVER_GROUP_NAME));
        });

        if (!keys?.length && !wdDirectProperties?.length && !indirectWdProperty && !osm_text_key) {
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
}
