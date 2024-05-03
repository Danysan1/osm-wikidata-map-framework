export const DEFAULT_SOURCE_PRESET_ID = "custom";
export interface SourcePreset {
    id: string;
    osm_filter_tags?: string[];
    osm_text_key?: string;
    osm_description_key?: string;
    osm_wikidata_keys?: string[];
    osm_wikidata_properties?: string[];
    fetch_parts_of_linked_entities?: boolean;
    wikidata_indirect_property?: string;
    wikidata_image_property?: string;
    wikidata_country?: string;
    osm_country?: string;
    mapcomplete_theme?: string;
}