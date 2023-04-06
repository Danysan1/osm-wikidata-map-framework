import { getConfig, getBoolConfig } from '../config';
import { DropdownControl, DropdownItem } from './DropdownControl';
import { setFragmentParams } from '../fragment';

/**
 * Let the user choose the map style.
 * 
 * @see https://docs.mapbox.com/mapbox-gl-js/example/toggle-layers/
 **/
export class SourceControl extends DropdownControl {
    constructor(startSourceID: string, onSourceChange: (sourceID: string) => void) {
        const rawKeys = getConfig("osm_wikidata_keys"),
            keys = rawKeys ? JSON.parse(rawKeys) as string[] : null,
            rawOsmProps = getConfig("osm_wikidata_properties"),
            osmProps = rawOsmProps ? JSON.parse(rawOsmProps) as string[] : null,
            indirectWdProperty = getConfig("wikidata_indirect_property"),
            propagationEnabled = getBoolConfig("propagate_data"),
            dbEnabled = getBoolConfig("db_enable"),
            dropdownItems: DropdownItem[] = [],
            buildDropdownItem = (sourceID: string, text: string, category?: string): DropdownItem => ({
                id: sourceID,
                text: text,
                category: category,
                onSelect: () => {
                    onSourceChange(sourceID);
                    setFragmentParams(undefined, undefined, undefined, undefined, sourceID);
                    this.showDropdown(false);
                }
            });

        if (dbEnabled) {
            dropdownItems.push(buildDropdownItem("db_all", "All sources from DB", "DB"));

            if (keys) {
                keys.forEach(key => {
                    const keyID = "db_osm_" + key.replace(":wikidata", "").replace(":", "_");
                    dropdownItems.push(buildDropdownItem(keyID, "OSM " + key, "DB"));
                });
            }

            if (osmProps && osmProps.length > 0)
                dropdownItems.push(buildDropdownItem("db_osm_wikidata_direct", "OSM wikidata + Wikidata " + osmProps.join("/"), "DB"));

            if (indirectWdProperty)
                dropdownItems.push(buildDropdownItem("db_osm_wikidata_reverse", "OSM wikidata + Wikidata referenced with " + indirectWdProperty, "DB"));

            if (propagationEnabled)
                dropdownItems.push(buildDropdownItem("db_propagated", "Propagated", "DB"));
        }

        if (osmProps && osmProps.length > 0)
            dropdownItems.push(buildDropdownItem("wd_direct", "Wikidata " + osmProps.join("/"), "Wikidata API (real time)"));

        if (indirectWdProperty) {
            dropdownItems.push(buildDropdownItem("wd_indirect", "P625 qualifiers & Wikidata entities referenced from " + indirectWdProperty, "Wikidata API (real time)"));
            dropdownItems.push(buildDropdownItem("wd_qualifier", "P625 qualifiers on " + indirectWdProperty, "Wikidata API (real time)"));
            dropdownItems.push(buildDropdownItem("wd_reverse", "Wikidata entities referenced with " + indirectWdProperty, "Wikidata API (real time)"));
        }

        if (keys) {
            if (keys.length > 1)
                dropdownItems.push(buildDropdownItem("overpass_all", "OSM " + keys.join(" / "), "Overpass + Wikidata APIs (real time)"));

            keys.forEach(key => {
                const source = "overpass_osm_" + key.replace(":wikidata", "").replace(":", "_");
                dropdownItems.push(buildDropdownItem(source, "OSM " + key, "Overpass + Wikidata APIs (real time)"));
            });
        }

        super(
            '⚙️',
            dropdownItems,
            startSourceID,
            'Choose source',
            true
        );
    }
}
