import { getConfig, getBoolConfig, debug, getJsonConfig } from '../config';
import { DropdownControl, DropdownItem } from './DropdownControl';
import { getCorrectFragmentParams, setFragmentParams } from '../fragment';
import { TFunction } from "i18next";
import { logErrorMessage } from '../monitoring';

const PMTILES_GROUP = "PMTiles",
    DB_GROUP = "DB",
    VECTOR_GROUP = "DB (Vector Tiles)",
    OVERPASS_GROUP = "OpenStreetMap (Overpass API)",
    WIKIDATA_GROUP = "Wikidata Query Service",
    OSM_WD_GROUP = "OSM (Overpass API) + Wikidata Query Service";

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
            dbEnabled = getBoolConfig("db_enable"),
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
            dropdownItems.push(buildDropdownItem("pmtiles_all", t("source.db_all", "All sources from DB"), PMTILES_GROUP));
        if (vectorTilesEnabled)
            dropdownItems.push(buildDropdownItem("vector_all", t("source.db_all", "All sources from DB"), VECTOR_GROUP));
        if (dbEnabled)
            dropdownItems.push(buildDropdownItem("db_all", t("source.db_all", "All sources from DB"), DB_GROUP));

        if (keys && keys?.length > 1)
            dropdownItems.push(buildDropdownItem("overpass_all", t("source.all_osm_keys", "All OSM keys"), OVERPASS_GROUP));

        keys?.forEach(key => {
            const keyID = "osm_" + key.replace(":wikidata", "").replace(":", "_");
            dropdownItems.push(buildDropdownItem("overpass_" + keyID, "OSM " + key, OVERPASS_GROUP));
            if (vectorTilesEnabled)
                dropdownItems.push(buildDropdownItem("vector_" + keyID, "OSM " + key, VECTOR_GROUP));
            if (dbEnabled)
                dropdownItems.push(buildDropdownItem("db_" + keyID, "OSM " + key, DB_GROUP));
        });

        if (wdDirectProperties?.length) {
            if (vectorTilesEnabled)
                dropdownItems.push(buildDropdownItem("vector_osm_wikidata_direct", "OSM wikidata + Wikidata " + wdDirectProperties.join("/"), VECTOR_GROUP));

            if (dbEnabled)
                dropdownItems.push(buildDropdownItem("db_osm_wikidata_direct", "OSM wikidata + Wikidata " + wdDirectProperties.join("/"), DB_GROUP));

            dropdownItems.push(buildDropdownItem("wd_direct", "Wikidata " + wdDirectProperties.join("/"), WIKIDATA_GROUP));
            dropdownItems.push(buildDropdownItem("overpass_wd+wd_direct", "OSM wikidata + Wikidata " + wdDirectProperties.join("/"), OSM_WD_GROUP));
            if (keys?.length)
                dropdownItems.push(buildDropdownItem("overpass_all_wd+wd_direct", t("source.all_osm_keys", "All OSM keys") + " + Wikidata " + wdDirectProperties.join("/"), OSM_WD_GROUP));
        }

        if (indirectWdProperty) {
            if (vectorTilesEnabled)
                dropdownItems.push(buildDropdownItem("vector_osm_wikidata_reverse", t("source.db_osm_wikidata_reverse", `Wikidata entities referenced with OSM wikidata=* and ${indirectWdProperty}`, { indirectWdProperty }), VECTOR_GROUP));

            if (dbEnabled)
                dropdownItems.push(buildDropdownItem("db_osm_wikidata_reverse", t("source.db_osm_wikidata_reverse", `Wikidata entities referenced with OSM wikidata=* and ${indirectWdProperty}`, { indirectWdProperty }), DB_GROUP));

            dropdownItems.push(buildDropdownItem("wd_indirect", t("source.wd_indirect", { indirectWdProperty }), WIKIDATA_GROUP));
            dropdownItems.push(buildDropdownItem("wd_qualifier", t("source.wd_qualifier", { indirectWdProperty }), WIKIDATA_GROUP));
            dropdownItems.push(buildDropdownItem("wd_reverse", t("source.wd_reverse", { indirectWdProperty }), WIKIDATA_GROUP));
            dropdownItems.push(buildDropdownItem("overpass_wd+wd_indirect", "OSM wikidata + " + t("source.wd_indirect", { indirectWdProperty }), OSM_WD_GROUP));
            dropdownItems.push(buildDropdownItem("overpass_wd+wd_reverse", "OSM wikidata + " + t("source.wd_reverse", { indirectWdProperty }), OSM_WD_GROUP));
            if (keys?.length) {
                dropdownItems.push(buildDropdownItem("overpass_all_wd+wd_indirect", t("source.all_osm_keys", "All OSM keys") + " + " + t("source.wd_indirect", { indirectWdProperty }), OSM_WD_GROUP));
                dropdownItems.push(buildDropdownItem("overpass_all_wd+wd_qualifier", t("source.all_osm_keys", "All OSM keys") + " + " + t("source.wd_qualifier", { indirectWdProperty }), OSM_WD_GROUP));
                dropdownItems.push(buildDropdownItem("overpass_all_wd+wd_reverse", t("source.all_osm_keys", "All OSM keys") + " + " + t("source.wd_reverse", { indirectWdProperty }), OSM_WD_GROUP));
            }
        }

        if (!keys?.length && !wdDirectProperties?.length && !indirectWdProperty && !osm_text_key) {
            dropdownItems.push(buildDropdownItem("overpass_wd", "OSM wikidata=*", OVERPASS_GROUP));
            dropdownItems.push(buildDropdownItem("overpass_wd+wd_base", "OSM wikidata + Wikidata", OSM_WD_GROUP));
            dropdownItems.push(buildDropdownItem("wd_base", "Wikidata", WIKIDATA_GROUP));
        }

        if (propagationEnabled && vectorTilesEnabled)
            dropdownItems.push(buildDropdownItem("vector_propagated", t("source.propagated", "Propagated"), VECTOR_GROUP));
        if (propagationEnabled && dbEnabled)
            dropdownItems.push(buildDropdownItem("db_propagated", t("source.propagated", "Propagated"), DB_GROUP));

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
