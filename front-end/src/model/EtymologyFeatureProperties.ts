import type { Etymology, OsmType } from "./Etymology";

interface OsmToGeoJsonRelation {
    rel: number;
    reltags: Record<string, string>;
    role?: string;
}

export interface EtymologyFeatureProperties {
    /**
     * Vector tiles support only flat properties so OSM tags will be dumped here
     */
    [key: string]: unknown;
    /**
     * osmtogeojson dumps OSM tags here
     * 
     * Typically in GeoJSON backends etymologies are sent as a JS object.
     * Vector sources in both Mapbox GL and MapLibre GL however stringify the array as JSON in some circumstances.
     */
    tags?: Record<string, string>;
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
     * Alternative names of the feature, separated by a semicolon
     */
    alt_name?: string;
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
     * Typically in GeoJSON backends etymologies are sent as an array of Etymology JS objects.
     * Vector sources in both Mapbox GL and MapLibre GL however stringify the array as JSON in some circumstances.
     */
    etymologies?: Etymology[] | string;
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
     * Localized name of the feature
     */
    name?: string;
    /**
     * Localized description of the feature
     */
    description?: string;
    /**
     * Official name of the feature
     */
    official_name?: string;
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
    website_url?: string;
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

