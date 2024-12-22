import type { Etymology, OsmType } from "./Etymology";

interface OsmToGeoJsonRelation {
    rel: number;
    reltags: Record<string, string>;
    role?: string;
}

export interface FeatureTags {
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
     * Default Wikipedia reference
     * Prefer using the value in OwmfFeatureProperties which is checked for correctness
     * 
     * @see OwmfFeatureProperties.wikipedia
     * @link https://wiki.openstreetmap.org/wiki/Key:wikipedia
     */
    wikipedia?: string;
}

export interface OwmfFeatureProperties {
    /**
     * Raw OSM tags.
     * These may be dumped by osmtogeojson, taken from the dump or simulated from Wikidata statements.
     * 
     * Typically in GeoJSON backends i18n is sent as a JS object.
     * Vector sources however stringify the object to JSON string in some circumstances.
     */
    tags?: FeatureTags | string;

    /**
     * osmtogeojson dumps here information about relations this element is part of
     */
    relations?: OsmToGeoJsonRelation[];

    /**
     * Unique ID of the feature
     * For OSM elements this is the OSM ID ({osm_type}/{osm_id})
     * For Wikidata entities this is the Q-ID
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
    linked_entities?: Etymology[] | string;

    /**
     * Whether OpenStreetMap is the original source of the geometry and names of this feature.
     */
    from_osm?: boolean;

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

    /**
     * Number of linked entities
     */
    linked_entity_count?: number;

    /**
     * Type of the OpenStreetMap element for this feature
     */
    osm_type?: OsmType;

    /**
     * ID (unique only within its osm_type) of the OpenStreetMap element for this feature
     */
    osm_id?: number;

    /**
     * Title of a Wikimedia Commons picture for this feature
     */
    picture?: string;

    /**
     * Height of the feature in meters
     */
    render_height?: number;

    /**
     * Textual name of the etymology
     */
    text_etymology?: string;

    /**
     * Textual description of the etymology
     */
    text_etymology_descr?: string;

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

export function getPropLinkedEntities(props: OwmfFeatureProperties): Etymology[] {
    if (typeof props?.linked_entities === "string") {
        props.linked_entities = JSON.parse(props.linked_entities) as Etymology[];
        return props.linked_entities;
    } else if (!props.linked_entities) {
        props.linked_entities = [];
        return props.linked_entities;
    } else {
        return props.linked_entities;
    }
}

export function getPropTags(props: OwmfFeatureProperties): FeatureTags {
    if (typeof props?.tags === "string") {
        props.tags = JSON.parse(props.tags) as FeatureTags;
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
        localName = tags[localNameKey];
    if (typeof localName === "string")
        return localName;
    else if (tags.name)
        return tags.name;
    else
        return null;
}
