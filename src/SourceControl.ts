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
            sources: Record<string, string> = {
                all: "All sources from DB",
            };
        if (propagationEnabled) {
            sources.osm_propagated = "Propagated (from DB)";
        }

        if (rawOsmProps) {
            const props = JSON.parse(rawOsmProps) as string[];
            sources.osm_wikidata = "OSM + Wikidata " + props.join("/") + " (from DB)";
        }

        if (rawWdProperty) {
            sources.wd_qualifier = "Wikidata " + rawWdProperty + "+P625 (real time via Wikidata SPARQL API)";
        }

        if (rawKeys) {
            sources.overpass = "OSM (real time via Overpass API)";
            const keys = JSON.parse(rawKeys) as string[];
            keys.forEach(key => {
                const keyID = "osm_" + key.replace(":wikidata", "").replace(":", "_");
                sources[keyID] = "OSM " + key + " (from DB)";
            });
        }

        const dropdownItems: DropdownItem[] = Object.entries(sources).map(([sourceID, text]) => ({
            id: sourceID,
            text: text,
            onSelect: () => {
                onSourceChange(sourceID);
                setFragmentParams(undefined, undefined, undefined, undefined, sourceID);
                this.showDropdown(false);
            }
        }));
        super(
            '⚙️',
            dropdownItems,
            startSourceID,
            'Choose source',
            true
        );
    }
}
