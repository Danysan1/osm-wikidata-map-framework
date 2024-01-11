export const OsmTypes = ['node', 'way', 'relation'] as const;
export type OsmType = typeof OsmTypes[number];

export const OsmWdJoinFields = ['OSM', 'P11693', 'P10689', 'P402'] as const;
export type OsmWdJoinField = typeof OsmWdJoinFields[number];

export interface Etymology {
    /**
     * Whether OpenStreetMap is the original source of this etymology
     */
    from_osm?: boolean;
    /**
     * Type of the source OpenStreetMap element
     */
    from_osm_type?: OsmType;
    /**
     * ID (unique only within its osm_type) of the source OpenStreetMap element
     */
    from_osm_id?: number;
    /**
     * Whether Wikidata is the original source of this etymology
     */
    from_wikidata?: boolean;
    /**
     * Q-ID of the source Wikidata entity this etymology has been extracted from
     */
    from_wikidata_entity?: string;
    /**
     * P-ID of the Wikidata property that links from the source Wikidata entity to this etymology entity
     */
    from_wikidata_prop?: string;
    /**
     * If this etymology's feature has both an OSM element and Wikidata entity, this field specifies the clause used to join them. In theory the OSM-WD link should be biunivocal and this field should be on the feature (not on the etymology), however in practice this is not always the case (ex. https://gitlab.com/openetymologymap/osm-wikidata-map-framework/-/issues/18) so to debug the etymology source it's necessary to specify it for each etymology.
     */
    osm_wd_join_field?: OsmWdJoinField;
    /**
     * Q-ID of the etymology Wikidata entity that contained this entity, leading to the inclusion of this entity as well
     */
    from_parts_of_wikidata_cod?: string;
    /**
     * Whether this etymology has been obtained through propagation
     */
    propagated?: boolean;
    /**
     * Q-ID of this etymology Wikidata item
     */
    wikidata?: string;
    /**
     * List of Wikidata Q-IDs of entities that are part of this etymology
     */
    parts?: string[];
}

