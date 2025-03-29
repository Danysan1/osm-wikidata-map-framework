import type { LinkedEntity, OsmInstance, OsmType } from "./LinkedEntity";

export interface OsmFeatureTags {
    /**
     * Other tags.
     * This includes localized names in name:* .
     */
    [key: string]: string | undefined;

    /**
     * Alternative names of the feature, separated by a semicolon
     * 
     * @link https://wiki.openstreetmap.org/wiki/Key:alt_name
     */
    alt_name?: string;

    /**
     * Type of building
     * 
     * @link https://wiki.openstreetmap.org/wiki/Key:building
     */
    building?: string;

    /**
     * Number of levels of the building
     * 
     * @link https://wiki.openstreetmap.org/wiki/Key:building:levels
     */
    "building:levels"?: string;

    /**
     * Default description of the feature
     * 
     * @link https://wiki.openstreetmap.org/wiki/Key:description
     */
    description?: string;

    /**
     * @link https://wiki.openstreetmap.org/wiki/Key:height
     */
    height?: string

    /**
     * Default name of the feature
     * 
     * @link https://wiki.openstreetmap.org/wiki/Key:name
     */
    name?: string;

    /**
     * Official name of the feature
     * 
     * @link https://wiki.openstreetmap.org/wiki/Key:official_name
     */
    official_name?: string;

    /**
     * UUID or URL of a Panoramax picture of this feature
     * Prefer using the value in OwmfFeatureProperties which is checked for correctness
     * 
     * @example "5cd07218-e964-4279-a173-9b6c198b41ab"
     * @example "https://taginfo.openstreetmap.org/tags/?key=panoramax&value=https%3A%2F%2Fpanoramax.openstreetmap.fr%2F%23focus%3Dpic%26map%3D15.6%2F47.419874%2F0.716441%26pic%3D0c39170f-cee5-42e8-adc4-c05c3e359068%26speed%3D250%26xyz%3D245.00%2F0.00%2F30"
     * @link https://wiki.openstreetmap.org/wiki/Key:panoramax
     */
    panoramax?: string;

    /**
     * URL of the official website for this element
     * 
     * @link https://wiki.openstreetmap.org/wiki/Key:website
     */
    website?: string;

    /**
     * Raw wikidata Q-ID.
     * Prefer using the value in OwmfFeatureProperties which is checked for correctness
     * 
     * @see OwmfFeatureProperties.wikidata
     * @link https://wiki.openstreetmap.org/wiki/Key:wikidata
     */
    wikidata?: string;

    /**
     * Raw URL or name of Wikimedia Commons category or file.
     * Prefer using the values in OwmfFeatureProperties which are checked for correctness
     * 
     * @see OwmfFeatureProperties.commons
     * @see OwmfFeatureProperties.picture
     * @link https://wiki.openstreetmap.org/wiki/Key:wikimedia_commons
     */
    wikimedia_commons?: string;

    /**
     * Default Wikipedia reference
     * Prefer using the value in OwmfFeatureProperties which is checked for correctness
     * 
     * @see OwmfFeatureProperties.wikipedia
     * @link https://wiki.openstreetmap.org/wiki/Key:wikipedia
     */
    wikipedia?: string;

    /**
     * Unofficial tag used by type=person relations to represent the birth date of the subject
     * 
     * @link https://wiki.openstreetmap.org/wiki/Proposal:Relation:person_(rewrite)
     */
    born?: string;

    /**
     * Unofficial tag used by type=person relations to represent the birth place of the subject
     * 
     * @link https://wiki.openstreetmap.org/wiki/Proposal:Relation:person_(rewrite)
     */
    birthplace?: string;

    /**
     * Unofficial tag used by type=person relations to represent the death date of the subject
     * 
     * @link https://wiki.openstreetmap.org/wiki/Proposal:Relation:person_(rewrite)
     */
    died?: string;

    /**
     * Unofficial tag used by type=person relations to represent the birth place of the subject
     * 
     * @link https://wiki.openstreetmap.org/wiki/Proposal:Relation:person_(rewrite)
     */
    deathplace?: string;
}

/**
 * osmtogeojson dumps here information about each relation that other elements are part of
 */
interface OsmToGeoJsonRelation {
    /**
     * OSM relation ID
     * 
     * @example 42 => https://www.openstreetmap.org/relation/42
     */
    rel: number;

    /**
     * Tags of the the relation
     */
    reltags: OsmFeatureTags;

    /**
     * Role that the linked element has in the relation
     */
    role?: string;
}

export interface OwmfFeatureProperties {
    /**
     * Raw OSM tags.
     * These may be dumped by osmtogeojson, taken from the dump or simulated from Wikidata statements.
     * 
     * Typically in GeoJSON backends i18n is sent as a JS object.
     * Vector sources however stringify the object to JSON string in some circumstances.
     */
    tags?: OsmFeatureTags | string;

    /**
     * osmtogeojson dumps here information about relations this element is part of
     */
    relations?: OsmToGeoJsonRelation[];

    /**
     * Unique ID of the feature.
     * This is a duplicate of the Feature.id JSON spec property but sometimes Maplibre erases it so we need this backup
     * 
     * @example "openstreetmap.org/way/42"
     * @example "openhistoricalmap.org/way/42"
     * @example "wikidata.org/entity/Q42"
     * @example "openstreetmap.org/way/42_wikidata.org/entity/P42"
     */
    id?: string;

    /**
     * Whether the feature is a boundary.
     * For OSM features this means type=boundary or boundary=*.
     * Currently not supported for Wikidata features.
     */
    boundary?: boolean;

    /**
     * Name of the Wikimedia Commons category for this feature
     */
    commons?: string;

    /**
     * Internal ID for this feature (unique within the request but may vary after OWMF DB updates)
     */
    el_id?: number;

    /**
     * List of linked items that describe some aspect of this feature.
     * Which aspect is represented depends on the configuration of this OWMF instance.
     * 
     * Typically in GeoJSON backends linked entities are sent as an array of Etymology JS objects.
     * Vector sources however stringify the array to JSON string in some circumstances.
     */
    linked_entities?: LinkedEntity[] | string;

    /**
     * Whether OpenStreetMap instance is the original source of the geometry and names of this feature.
     */
    from_osm_instance?: OsmInstance;

    /**
     * Whether Wikidata is the original source of the geometry and/or names of this feature.
     */
    from_wikidata?: boolean;

    /**
     * Q-ID of the Wikidata entity this feature's geometry has been extracted from. This may or may not be the same as the Wikidata entity of this feature.
     */
    from_wikidata_entity?: string;

    /**
     * P-ID of the Wikidata property that links from the source Wikidata entity to the geometry of this feature. This may represent a direct geo statement (ex. P625) or a statement with a geo qualifier (ex. P625 on P119, in this case P119 must be used).
     */
    from_wikidata_prop?: string;

    iiif_url?: string;

    /**
     * Number of linked entities
     */
    linked_entity_count?: number;

    /**
     * Type of the OpenStreetMap element for this feature
     */
    osm_type?: OsmType;

    /**
     * Type of the OpenHistoricalMap element for this feature
     */
    ohm_type?: OsmType;

    /**
     * ID (unique only within its osm_type) of the OpenStreetMap element for this feature
     */
    osm_id?: number;

    /**
     * ID (unique only within its osm_type) of the OpenHistoricalMap element for this feature
     */
    ohm_id?: number;

    /**
     * Title of a Wikimedia Commons picture for this feature
     */
    picture?: string;

    /**
     * Height of the feature in meters
     */
    render_height?: number;

    /**
     * Q-ID of the Wikidata entity for this feature
     */
    wikidata?: string;

    /**
     * Q-ID of a duplicate Wikidata entity which represents this same feature (linked through owl:sameAs)
     */
    wikidata_alias?: string;

    /**
     * Title of a Wikipedia page for this feature prefixed with its language code (<language>:<Page name>)
     */
    wikipedia?: string;

    /**
     * Title of a Wikispore page for this feature
     */
    wikispore?: string;
}

export function getPropLinkedEntities(props: OwmfFeatureProperties): LinkedEntity[] {
    if (typeof props?.linked_entities === "string") {
        props.linked_entities = JSON.parse(props.linked_entities) as LinkedEntity[];
        return props.linked_entities;
    } else if (!props.linked_entities) {
        props.linked_entities = [];
        return props.linked_entities;
    } else {
        return props.linked_entities;
    }
}

function parseJsonTags(tags: string): OsmFeatureTags {
    const out: unknown = JSON.parse(tags);
    if (!out || typeof out !== "object")
        throw new Error("Failed parsing JSON string for tags of feature: " + tags);
    return out as OsmFeatureTags;
}

/**
 * Returns the tags of a feature from its properties, if available, without side effects
 */
export function getPropTags(props: OwmfFeatureProperties): OsmFeatureTags | undefined {
    return typeof props.tags === "string" ? parseJsonTags(props.tags) : props.tags;
}

/**
 * Returns the tags of a feature from its properties, creating an empty oject if they are missing
 */
export function createPropTags(props: OwmfFeatureProperties): OsmFeatureTags {
    if (typeof props?.tags === "string") {
        props.tags = parseJsonTags(props.tags);
        return props.tags;
    } else if (!props.tags) {
        props.tags = {};
        return props.tags;
    } else {
        return props.tags;
    }
}

export function getLocalizedName(props: OwmfFeatureProperties, language: string): string | null {
    const localNameKey = "name:" + language,
        tags = getPropTags(props),
        localName = tags?.[localNameKey];
    if (typeof localName === "string")
        return localName;
    else if (tags?.name)
        return tags.name;
    else
        return null;
}
