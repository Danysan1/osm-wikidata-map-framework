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
            rawProps = getConfig("wikidata_properties"),
            propagationEnabled = getConfig("propagate_data") == 'true',
            sources: Record<string, string> = {
                overpass: "OSM (real time via Overpass API)",
                all: "All sources from DB",
            };
        if (propagationEnabled) {
            sources.propagated = "Propagated (from DB)";
        }

        if (!rawProps) {
            console.warn("Missing wikidata_properties");
        } else {
            const props = JSON.parse(rawProps) as string[];
            sources.wikidata = "OSM + Wikidata " + props.join("/") + " (from DB)";
        }

        if (!rawKeys) {
            console.warn("Missing osm_wikidata_keys");
        } else {
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
