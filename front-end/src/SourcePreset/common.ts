import { parseBoolConfig, parseStringArrayConfig } from '../config';
import { DEFAULT_SOURCE_PRESET_ID, SourcePreset } from '../model/SourcePreset';

export function getCustomSourcePreset(): SourcePreset {
    return {
        default_backend: process.env.owmf_default_backend,
        fetch_parts_of_linked_entities: parseBoolConfig(process.env.owmf_fetch_parts_of_linked_entities),
        id: DEFAULT_SOURCE_PRESET_ID,
        mapcomplete_theme: process.env.owmf_mapcomplete_theme,
        osm_filter_tags: process.env.owmf_osm_filter_tags ? parseStringArrayConfig(process.env.owmf_osm_filter_tags) : undefined,
        osm_text_key: process.env.owmf_osm_text_key,
        osm_description_key: process.env.owmf_osm_description_key,
        osm_wikidata_keys: process.env.owmf_osm_wikidata_keys ? parseStringArrayConfig(process.env.owmf_osm_wikidata_keys) : undefined,
        osm_wikidata_properties: process.env.owmf_osm_wikidata_properties ? parseStringArrayConfig(process.env.owmf_osm_wikidata_properties) : undefined,
        relation_role_whitelist: process.env.owmf_relation_role_whitelist ? parseStringArrayConfig(process.env.owmf_relation_role_whitelist) : undefined,
        wikidata_indirect_property: process.env.owmf_wikidata_indirect_property,
        wikidata_image_property: process.env.owmf_wikidata_image_property,
    };
}
