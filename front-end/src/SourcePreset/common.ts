import { parseStringArrayConfig } from '../config';
import { DEFAULT_SOURCE_PRESET_ID, SourcePreset } from '../model/SourcePreset';

export function getActiveSourcePresetIDs(): string[] {
    if (!process.env.NEXT_PUBLIC_OWMF_source_presets?.trim()) {
        console.debug("getActiveSourcePresetIDs: using default value:", DEFAULT_SOURCE_PRESET_ID);
        return [DEFAULT_SOURCE_PRESET_ID];
    }

    try {
        const presets = parseStringArrayConfig(process.env.NEXT_PUBLIC_OWMF_source_presets);
        if (presets.length) return presets;
        else return [DEFAULT_SOURCE_PRESET_ID];
    } catch (parseError) {
        console.debug("getActiveSourcePresetIDs: using raw value", { parseError, value: process.env.NEXT_PUBLIC_OWMF_source_presets });
        return [process.env.NEXT_PUBLIC_OWMF_source_presets];
    }
}

export function getCustomSourcePreset(): SourcePreset {
    return {
        id: DEFAULT_SOURCE_PRESET_ID,
        fetch_parts_of_linked_entities: !!process.env.NEXT_PUBLIC_OWMF_fetch_parts_of_linked_entities,
        mapcomplete_theme: process.env.NEXT_PUBLIC_OWMF_mapcomplete_theme,
        osm_filter_tags: process.env.NEXT_PUBLIC_OWMF_osm_filter_tags ? parseStringArrayConfig(process.env.NEXT_PUBLIC_OWMF_osm_filter_tags) : undefined,
        osm_text_key: process.env.NEXT_PUBLIC_OWMF_osm_text_key,
        osm_description_key: process.env.NEXT_PUBLIC_OWMF_osm_description_key,
        osm_wikidata_keys: process.env.NEXT_PUBLIC_OWMF_osm_wikidata_keys ? parseStringArrayConfig(process.env.NEXT_PUBLIC_OWMF_osm_wikidata_keys) : undefined,
        osm_wikidata_properties: process.env.NEXT_PUBLIC_OWMF_osm_wikidata_properties ? parseStringArrayConfig(process.env.NEXT_PUBLIC_OWMF_osm_wikidata_properties) : undefined,
        relation_propagation_role: process.env.NEXT_PUBLIC_OWMF_relation_propagation_role,
        relation_member_role: process.env.NEXT_PUBLIC_OWMF_relation_member_role,
        wikidata_indirect_property: process.env.NEXT_PUBLIC_OWMF_wikidata_indirect_property,
        wikidata_image_property: process.env.NEXT_PUBLIC_OWMF_wikidata_image_property,
    };
}
