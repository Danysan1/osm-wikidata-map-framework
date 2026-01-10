export type OsmType = 'node' | 'way' | 'relation';
export type OsmWdJoinField = 'OSM' | 'P11693' | 'P10689' | 'P402';

export function parseOsmType(text?: string): OsmType | undefined {
    if (!text)
        return undefined;

    const lower = text?.toLowerCase();
    if (lower === "node" || lower === "n")
        return "node";
    if (lower === "way" || lower === "w")
        return "way";
    if (lower === "relation" || lower === "rel" || lower === "r")
        return "relation";

    return undefined;
}

/**
 * Date precision as documented in https://www.wikidata.org/wiki/Help:Dates#Precision
 */
export const enum DatePrecision {
    second = 14,
    minute = 13,
    hour = 12,
    day = 11,
    month = 10,
    year = 9,
    decade = 8,
    century = 7,
    millennium = 6,
    hundred_thousand_years = 4,
    million_years = 3,
    billion_years = 0,
}

export interface LinkedEntity {
    /**
     * Which (if any) OpenStreetMap instance is the original source of the link to this entity
     * @example "osm.org"
     * @example "openstreetmap.org"
     * @example "openhistoricalmap.org"
     */
    from_osm_instance?: string;

    /**
     * Type of the source OpenStreetMap element
     * 
     * @example node => https://www.openstreetmap.org/node/...
     */
    from_osm_type?: OsmType;

    /**
     * ID (unique only within its osm_type) of the source OpenStreetMap element
     * 
     * @example 42 => https://www.openstreetmap.org/.../42
     */
    from_osm_id?: number;

    /**
     * Q-ID of the linked Wikidata entity that contained this entity, leading to the inclusion of this entity as well
     */
    from_parts_of_wikidata_cod?: string;

    /**
     * If this relationship is derived from a Wikidata statement that is the subject of an entity, this field contains the Q-ID of the subject of that statement
     */
    from_statement_of_wikidata_cod?: string;

    /**
     * Whether Wikidata is the original source of the link to this entity
     */
    from_wikidata?: boolean;

    /**
     * Q-ID of the source Wikidata entity from which the link to this entity has been extracted
     */
    from_wikidata_entity?: string;

    /**
     * P-ID of the Wikidata property that links from the source Wikidata entity to this entity
     */
    from_wikidata_prop?: string;

    /**
     * Localized name of the subject
     */
    name?: string;

    /**
     * Type of the OpenStreetMap element for this entity
     */
    osm_type?: OsmType;

    /**
     * ID (unique only within its osm_type) of the OpenStreetMap element for this entity
     */
    osm_id?: number;

    /**
     * If the feature has both an OSM element and Wikidata entity, this field specifies the clause used to join them.
     * In theory the OSM-WD feature link should be bi-univocal and this field should be on the feature;
     * however in practice this is not always the case (ex. https://gitlab.com/openetymologymap/osm-wikidata-map-framework/-/issues/18);
     * so to debug the linked entity source it's necessary to specify it for each linked entity.
     */
    osm_wd_join_field?: OsmWdJoinField;

    /**
     * Title of a Wikimedia Commons picture for this feature-entity link
     */
    linkPicture?: string;

    /**
     * Whether this feature-entity link has been obtained through propagation
     */
    propagated?: boolean;

    /**
     * Q-ID of this Wikidata entity
     */
    wikidata?: string;

    /**
     * List of Q-IDs of Wikidata entities that are part of this linked entity
     */
    parts?: string[];

    /**
     * Localized description of this linked entity
     */
    description?: string;

    /**
     * Q-ID of an alias Wikidata entity (which redirects to the main entity through owl:sameAs)
     */
    alias?: string;

    birth_date?: string;
    birth_date_precision?: DatePrecision;

    /**
     * Name of the place of birth
     */
    birth_place?: string;

    death_date?: string;
    death_date_precision?: DatePrecision;

    /**
     * Name of the place of death
     */
    death_place?: string;
}

export interface EntityLinkNote {
    /**
     * Q-ID of the Wikidata entity that this feature-entity link is subject of.
     * For example, the article describing the etymology represented by this statement.
     * @see https://www.wikidata.org/wiki/Property:P805
     */
    entityQID?: string;

    /**
     * Human readable list of languages in which the statement applies
     */
    languages?: string;
}
