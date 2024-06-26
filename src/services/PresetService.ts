
import { getBoolConfig, getConfig, getStringArrayConfig } from '../config';
import { DEFAULT_SOURCE_PRESET_ID, SourcePreset } from '../model/SourcePreset';

export async function fetchSourcePreset(sourcePresetID: string) {
    let preset: SourcePreset;
    if (sourcePresetID === DEFAULT_SOURCE_PRESET_ID) {
        preset = {
            default_backend: getConfig("default_backend") ?? undefined,
            fetch_parts_of_linked_entities: getBoolConfig("fetch_parts_of_linked_entities") ?? false,
            id: DEFAULT_SOURCE_PRESET_ID,
            mapcomplete_theme: getConfig("mapcomplete_theme") ?? undefined,
            osm_filter_tags: getStringArrayConfig("osm_filter_tags") ?? undefined,
            osm_text_key: getConfig("osm_text_key") ?? undefined,
            osm_description_key: getConfig("osm_description_key") ?? undefined,
            osm_wikidata_keys: getStringArrayConfig("osm_wikidata_keys") ?? undefined,
            osm_wikidata_properties: getStringArrayConfig("osm_wikidata_properties") ?? undefined,
            relation_role_whitelist: getStringArrayConfig("relation_role_whitelist") ?? undefined,
            wikidata_indirect_property: getConfig("wikidata_indirect_property") ?? undefined,
            wikidata_image_property: getConfig("wikidata_image_property") ?? undefined,
        }
    } else {
        const presetResponse = await fetch(`presets/${sourcePresetID}.json`);
        if (!presetResponse.ok)
            throw new Error(`Failed fetching preset "${sourcePresetID}.json"`);

        const presetObj: unknown = await presetResponse.json();
        if (presetObj === null || typeof presetObj !== "object")
            throw new Error(`Invalid preset object found in "${sourcePresetID}.json"`);

        preset = { id: sourcePresetID, ...presetObj };
    }
    if (process.env.NODE_ENV === 'development') console.debug("fetchSourcePreset", { sourcePresetID, preset });
    return preset;
}