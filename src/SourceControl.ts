import { getConfig } from './config';
import { DropdownControl, DropdownItem } from './DropdownControl';
import { setFragmentParams } from './fragment';

/**
 * Let the user choose the map style.
 * 
 * @see https://docs.mapbox.com/mapbox-gl-js/example/toggle-layers/
 **/
export class SourceControl extends DropdownControl {
    constructor(onSourceChange: (sourceID: string) => void, startSourceID: string) {
        const rawKeys = getConfig("osm_wikidata_keys"),
            rawOsmProps = getConfig("osm_wikidata_properties"),
            rawWdProperty = getConfig("wikidata_reverse_property"),
            propagationEnabled = getConfig("propagate_data") == 'true',
            dbEnabled = getConfig("db_enable") == 'true',
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
            dropdownItems.push(buildDropdownItem("all_db", "All sources from DB", "DB"));

            if (propagationEnabled)
                dropdownItems.push(buildDropdownItem("osm_propagated", "Propagated", "DB"));

            if (rawOsmProps) {
                const props = JSON.parse(rawOsmProps) as string[];
                dropdownItems.push(buildDropdownItem("osm_wikidata", "OSM wikidata + Wikidata " + props.join("/"), "DB"));
            }

            if (rawKeys) {
                const keys = JSON.parse(rawKeys) as string[];
                keys.forEach(key => {
                    const keyID = "osm_" + key.replace(":wikidata", "").replace(":", "_");
                    dropdownItems.push(buildDropdownItem(keyID, "OSM " + key, "DB"));
                });
            }
        }

        if (rawWdProperty)
            dropdownItems.push(buildDropdownItem("wd_qualifier", "Wikidata " + rawWdProperty + " + P625", "Wikidata API (real time)"));

        if (rawKeys) {
            const keys = JSON.parse(rawKeys) as string[];
            dropdownItems.push(buildDropdownItem("overpass", "OSM " + keys.join(" / "), "Overpass + Wikidata APIs (real time)"));
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
