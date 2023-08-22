import { getConfig, getBoolConfig, debugLog, getJsonConfig } from '../config';
import { DropdownControl, DropdownItem } from './DropdownControl';
import { getCorrectFragmentParams, setFragmentParams } from '../fragment';
import { TFunction } from "i18next";

/**
 * Let the user choose the map style.
 * 
 * @see https://docs.mapbox.com/mapbox-gl-js/example/toggle-layers/
 **/
export class SourceControl extends DropdownControl {
    constructor(
        startSourceID: string, onSourceChange: (sourceID: string) => void,
        t: TFunction,
        minZoomLevel: number
    ) {
        const keys: string[] | null = getJsonConfig("osm_wikidata_keys"),
            wdDirectProperties: string[] | null = getJsonConfig("osm_wikidata_properties"),
            indirectWdProperty = getConfig("wikidata_indirect_property"),
            propagationEnabled = getBoolConfig("propagate_data"),
            dbEnabled = getBoolConfig("db_enable"),
            dropdownItems: DropdownItem[] = [],
            buildDropdownItem = (sourceID: string, text: string, category?: string): DropdownItem => ({
                id: sourceID,
                text,
                category: category,
                onSelect: () => {
                    debugLog("Source selected", { sourceID });

                    // If the change came from a manual interaction, update the fragment params
                    setFragmentParams(undefined, undefined, undefined, undefined, sourceID);

                    // If the change came from a fragment change, update the dropdown
                    // Regardless of the source, update the map
                    onSourceChange(sourceID);

                    // Hide the dropdown to leave more space for the map
                    this.showDropdown(false);
                }
            });

        if (dbEnabled) {
            dropdownItems.push(buildDropdownItem("db_all", t("source.db_all"), "DB"));

            if (keys) {
                keys.forEach(key => {
                    const keyID = "db_osm_" + key.replace(":wikidata", "").replace(":", "_");
                    dropdownItems.push(buildDropdownItem(keyID, "OSM " + key, "DB"));
                });
            }

            if (wdDirectProperties?.length)
                dropdownItems.push(buildDropdownItem("db_osm_wikidata_direct", "OSM wikidata + Wikidata " + wdDirectProperties.join("/"), "DB"));

            if (indirectWdProperty)
                dropdownItems.push(buildDropdownItem("db_osm_wikidata_reverse", t("source.db_osm_wikidata_reverse", { indirectWdProperty }), "DB"));

            if (propagationEnabled)
                dropdownItems.push(buildDropdownItem("db_propagated", t("source.propagated"), "DB"));
        }

        if (keys?.length) {
            if (keys.length > 1)
                dropdownItems.push(buildDropdownItem("overpass_all", t("source.all_osm_keys"), "OpenStreetMap (Overpass API)"));

            keys.forEach(key => {
                const source = "overpass_osm_" + key.replace(":wikidata", "").replace(":", "_");
                dropdownItems.push(buildDropdownItem(source, "OSM " + key, "OpenStreetMap (Overpass API)"));
            });
        }

        if (wdDirectProperties?.length) {
            dropdownItems.push(buildDropdownItem("wd_direct", "Wikidata " + wdDirectProperties.join("/"), "Wikidata Query Service"));
            dropdownItems.push(buildDropdownItem("overpass_wd+wd_direct", "OSM wikidata + Wikidata " + wdDirectProperties.join("/"), "OSM (Overpass API) + Wikidata Query Service"));
            if (keys?.length)
                dropdownItems.push(buildDropdownItem("overpass_all_wd+wd_direct", t("source.all_osm_keys") + " + Wikidata " + wdDirectProperties.join("/"), "OSM (Overpass API) + Wikidata Query Service"));
        }

        if (indirectWdProperty) {
            dropdownItems.push(buildDropdownItem("wd_indirect", t("source.wd_indirect", { indirectWdProperty }), "Wikidata Query Service"));
            dropdownItems.push(buildDropdownItem("wd_qualifier", t("source.wd_qualifier", { indirectWdProperty }), "Wikidata Query Service"));
            dropdownItems.push(buildDropdownItem("wd_reverse", t("source.wd_reverse", { indirectWdProperty }), "Wikidata Query Service"));
            dropdownItems.push(buildDropdownItem("overpass_wd+wd_indirect", "OSM wikidata + " + t("source.wd_indirect", { indirectWdProperty }), "OSM (Overpass API) + Wikidata Query Service"));
            dropdownItems.push(buildDropdownItem("overpass_wd+wd_reverse", "OSM wikidata + " + t("source.wd_reverse", { indirectWdProperty }), "OSM (Overpass API) + Wikidata Query Service"));
            if (keys?.length) {
                dropdownItems.push(buildDropdownItem("overpass_all_wd+wd_indirect", t("source.all_osm_keys") + " + " + t("source.wd_indirect", { indirectWdProperty }), "OSM (Overpass API) + Wikidata Query Service"));
                dropdownItems.push(buildDropdownItem("overpass_all_wd+wd_qualifier", t("source.all_osm_keys") + " + " + t("source.wd_qualifier", { indirectWdProperty }), "OSM (Overpass API) + Wikidata Query Service"));
                dropdownItems.push(buildDropdownItem("overpass_all_wd+wd_reverse", t("source.all_osm_keys") + " + " + t("source.wd_reverse", { indirectWdProperty }), "OSM (Overpass API) + Wikidata Query Service"));
            }
        }

        if (!keys?.length && !wdDirectProperties?.length && !indirectWdProperty)
            dropdownItems.push(buildDropdownItem("overpass_wd+wd_base", "OSM wikidata + Wikidata", "OSM (Overpass API) + Wikidata Query Service"));

        super(
            '⚙️',
            dropdownItems,
            startSourceID,
            "source.choose_source",
            true,
            minZoomLevel,
            () => this.setCurrentID(getCorrectFragmentParams().source)
        );
    }
}
