import { getConfig, getBoolConfig, debug, getJsonConfig } from '../config';
import { DropdownControl, DropdownItem } from './DropdownControl';
import { getCorrectFragmentParams, setFragmentParams } from '../fragment';
import { TFunction } from "i18next";
import { logErrorMessage } from '../monitoring';

const PMTILES_GROUP_NAME = "PMTiles",
    VECTOR_GROUP_NAME = "DB",
    OVERPASS_GROUP_NAME = "OpenStreetMap (Overpass API)",
    WDQS_GROUP_NAME = "Wikidata Query Service",
    OVERPASS_WDQS_GROUP_NAME = "OSM (Overpass API) + Wikidata Query Service",
    QLEVER_GROUP_NAME = "QLever";

/**
 * Let the user choose the map style.
 * 
 * @see https://docs.mapbox.com/mapbox-gl-js/example/toggle-layers/
 **/
export class SourceControl extends DropdownControl {
    constructor(
        startSourceID: string, onSourceChange: (sourceID: string) => void, t: TFunction
    ) {
        const keys: string[] | null = getJsonConfig("osm_wikidata_keys"),
            wdDirectProperties: string[] | null = getJsonConfig("osm_wikidata_properties"),
            indirectWdProperty = getConfig("wikidata_indirect_property"),
            propagationEnabled = getBoolConfig("propagate_data"),
            qleverEnabled = getBoolConfig("qlever_enable"),
            vectorTilesEnabled = getBoolConfig("vector_tiles_enable"),
            pmtilesURL = getBoolConfig("pmtiles_base_url"),
            dropdownItems: DropdownItem[] = [],
            osm_text_key = getConfig("osm_text_key"),
            selectSource = (sourceID: string) => {
                if (debug) console.debug("Selecting source ", { sourceID });

                // If the change came from a manual interaction, update the fragment params
                setFragmentParams(undefined, undefined, undefined, undefined, sourceID);

                // If the change came from a fragment change, update the dropdown
                // Regardless of the source, update the map
                onSourceChange(sourceID);
            },
            buildDropdownItem = (sourceID: string, text: string, category?: string): DropdownItem => ({
                id: sourceID,
                text: text,
                category: category,
                onSelect: () => {
                    selectSource(sourceID);

                    // Hide the dropdown to leave more space for the map
                    this.showDropdown(false);
                }
            });

        if (pmtilesURL)
            dropdownItems.push(buildDropdownItem("pmtiles_all", t("source.db_all", "All sources from DB"), PMTILES_GROUP_NAME));
        if (vectorTilesEnabled)
            dropdownItems.push(buildDropdownItem("vector_all", t("source.db_all", "All sources from DB"), VECTOR_GROUP_NAME));

        if (keys && keys?.length > 1)
            dropdownItems.push(buildDropdownItem("overpass_all", t("source.all_osm_keys", "All OSM keys"), OVERPASS_GROUP_NAME));

        keys?.forEach(key => {
            const keyID = "osm_" + key.replace(":wikidata", "").replace(":", "_");
            dropdownItems.push(buildDropdownItem("overpass_" + keyID, "OSM " + key, OVERPASS_GROUP_NAME));
            if (vectorTilesEnabled)
                dropdownItems.push(buildDropdownItem("vector_" + keyID, "OSM " + key, VECTOR_GROUP_NAME));
        });

        if (wdDirectProperties?.length) {
            if (vectorTilesEnabled) {
                dropdownItems.push(buildDropdownItem("vector_osm_wikidata_direct", "OSM wikidata + Wikidata " + wdDirectProperties.join("/"), VECTOR_GROUP_NAME));
                dropdownItems.push(buildDropdownItem("vector_wd_direct", "Wikidata " + wdDirectProperties.join("/"), VECTOR_GROUP_NAME));
            }
            if (qleverEnabled) {
                dropdownItems.push(buildDropdownItem("qlever_osm_wikidata_direct", "OSM wikidata + Wikidata " + wdDirectProperties.join("/"), QLEVER_GROUP_NAME));
                dropdownItems.push(buildDropdownItem("qlever_wd_direct", "Wikidata " + wdDirectProperties.join("/"), QLEVER_GROUP_NAME));
            }
            dropdownItems.push(buildDropdownItem("wd_direct", "Wikidata " + wdDirectProperties.join("/"), WDQS_GROUP_NAME));
            dropdownItems.push(buildDropdownItem("overpass_wd+wd_direct", "OSM wikidata + Wikidata " + wdDirectProperties.join("/"), OVERPASS_WDQS_GROUP_NAME));
            if (keys?.length)
                dropdownItems.push(buildDropdownItem("overpass_all_wd+wd_direct", t("source.all_osm_keys", "All OSM keys") + " + Wikidata " + wdDirectProperties.join("/"), OVERPASS_WDQS_GROUP_NAME));
        }

        if (indirectWdProperty) {
            if (vectorTilesEnabled)
                dropdownItems.push(buildDropdownItem("vector_osm_wikidata_reverse", t("source.db_osm_wikidata_reverse", `Wikidata entities referenced with OSM wikidata=* and ${indirectWdProperty}`, { indirectWdProperty }), VECTOR_GROUP_NAME));

            if (qleverEnabled) {
                dropdownItems.push(buildDropdownItem("qlever_osm_wikidata_indirect", "OSM wikidata + " + t("source.wd_indirect", { indirectWdProperty }), QLEVER_GROUP_NAME));
                dropdownItems.push(buildDropdownItem("qlever_osm_wikidata_reverse", "OSM wikidata + " + t("source.wd_reverse", { indirectWdProperty }), QLEVER_GROUP_NAME));
            }
            dropdownItems.push(buildDropdownItem("wd_indirect", t("source.wd_indirect", { indirectWdProperty }), WDQS_GROUP_NAME));
            dropdownItems.push(buildDropdownItem("wd_qualifier", t("source.wd_qualifier", { indirectWdProperty }), WDQS_GROUP_NAME));
            dropdownItems.push(buildDropdownItem("wd_reverse", t("source.wd_reverse", { indirectWdProperty }), WDQS_GROUP_NAME));
            dropdownItems.push(buildDropdownItem("qlever_indirect", t("source.wd_indirect", { indirectWdProperty }), QLEVER_GROUP_NAME));
            dropdownItems.push(buildDropdownItem("qlever_qualifier", t("source.wd_qualifier", { indirectWdProperty }), QLEVER_GROUP_NAME));
            dropdownItems.push(buildDropdownItem("qlever_reverse", t("source.wd_reverse", { indirectWdProperty }), QLEVER_GROUP_NAME));
            dropdownItems.push(buildDropdownItem("overpass_wd+wd_indirect", "OSM wikidata + " + t("source.wd_indirect", { indirectWdProperty }), OVERPASS_WDQS_GROUP_NAME));
            dropdownItems.push(buildDropdownItem("overpass_wd+wd_reverse", "OSM wikidata + " + t("source.wd_reverse", { indirectWdProperty }), OVERPASS_WDQS_GROUP_NAME));
            if (keys?.length) {
                if (qleverEnabled) {
                    dropdownItems.push(buildDropdownItem("qlever_osm_all_indirect", t("source.all_osm_keys", "All OSM keys") + " + " + t("source.wd_indirect", { indirectWdProperty }), QLEVER_GROUP_NAME));
                    dropdownItems.push(buildDropdownItem("qlever_osm_all_qualifier", t("source.all_osm_keys", "All OSM keys") + " + " + t("source.wd_qualifier", { indirectWdProperty }), QLEVER_GROUP_NAME));
                    dropdownItems.push(buildDropdownItem("qlever_osm_all_reverse", t("source.all_osm_keys", "All OSM keys") + " + " + t("source.wd_reverse", { indirectWdProperty }), QLEVER_GROUP_NAME));
                }
                dropdownItems.push(buildDropdownItem("overpass_all_wd+wd_indirect", t("source.all_osm_keys", "All OSM keys") + " + " + t("source.wd_indirect", { indirectWdProperty }), OVERPASS_WDQS_GROUP_NAME));
                dropdownItems.push(buildDropdownItem("overpass_all_wd+wd_qualifier", t("source.all_osm_keys", "All OSM keys") + " + " + t("source.wd_qualifier", { indirectWdProperty }), OVERPASS_WDQS_GROUP_NAME));
                dropdownItems.push(buildDropdownItem("overpass_all_wd+wd_reverse", t("source.all_osm_keys", "All OSM keys") + " + " + t("source.wd_reverse", { indirectWdProperty }), OVERPASS_WDQS_GROUP_NAME));
            }
        }

        if (!keys?.length && !wdDirectProperties?.length && !indirectWdProperty && !osm_text_key) {
            dropdownItems.push(buildDropdownItem("overpass_wd", "OSM wikidata=*", OVERPASS_GROUP_NAME));
            dropdownItems.push(buildDropdownItem("overpass_wd+wd_base", "OSM wikidata + Wikidata", OVERPASS_WDQS_GROUP_NAME));
            dropdownItems.push(buildDropdownItem("wd_base", "Wikidata", WDQS_GROUP_NAME));
            dropdownItems.push(buildDropdownItem("qlever_base", "Wikidata", QLEVER_GROUP_NAME));
        }

        if (propagationEnabled && vectorTilesEnabled)
            dropdownItems.push(buildDropdownItem("vector_propagated", t("source.propagated", "Propagated"), VECTOR_GROUP_NAME));

        if (dropdownItems.find(item => item.id === startSourceID)) {
            if (debug) console.debug("Starting with valid sourceID", { startSourceID });
        } else {
            logErrorMessage("Invalid startSourceID", "warning", { oldID: startSourceID, dropdownItems, newID: dropdownItems[0].id });
            startSourceID = dropdownItems[0].id;
            selectSource(startSourceID);
        }

        super(
            '⚙️',
            dropdownItems,
            startSourceID,
            "source.choose_source",
            true,
            undefined,
            () => this.setCurrentID(getCorrectFragmentParams().source)
        );
    }
}
