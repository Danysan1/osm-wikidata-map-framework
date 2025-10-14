import { Feature, FeatureCollection, Geometry } from "geojson";
import { LinkedEntity } from "./LinkedEntity";
import { createPropTags, getPropLinkedEntities, getPropTags, OsmFeatureTags, OwmfFeatureProperties } from "./OwmfFeatureProperties";

export type OwmfResponseFeatureProperties = OwmfFeatureProperties | null;
export type OwmfFeature = Feature<Geometry, OwmfResponseFeatureProperties>;

export interface OwmfResponse extends FeatureCollection<Geometry, OwmfResponseFeatureProperties> {
    sourcePresetID?: string;

    /**
     * ID of the backEnd used to fetch the features.
     * 
     * Can be a single source ({source_id}_{key_id}) or a combination of sources ({source_id1}_{key_id1}+{source_id2}_{key_id2}).
     * 
     * Examples:
     *  - pmtiles_all
     *  - pmtiles_osm_name_etymology
     *  - pmtiles_ohm_name_etymology
     *  - pmtiles_osm_wd_direct
     *  - pmtiles_osm_wd_reverse
     *  - pmtiles_propagated
     *  - overpass_osm_wd
     *  - overpass_osm_all
     *  - overpass_ohm_all
     *  - overpass_osm_name_etymology
     *  - wd_base
     *  - wd_direct
     *  - wd_indirect
     *  - wd_qualifier
     *  - wd_reverse
     *  - overpass_osm_wd+wd_direct
     *  - qlever_osm_wd
     *  - qlever_osm_all
     *  - qlever_osm_name_etymology
     *  - qlever_wd_direct
     *  - qlever_wd_indirect 
     *  - qlever_wd_qualifier
     *  - qlever_wd_reverse
     *  - qlever_osm_wd_base
     *  - qlever_osm_wd_direct
     *  - qlever_osm_wd_reverse
     */
    backEndID?: string;

    onlyCentroids?: boolean;

    /** ISO string for the time the query was run */
    timestamp?: string;

    /** Total number of entities linked to the features */
    total_entity_count?: number;

    /** SPARQL query used to fetch the features from Wikidata Query Service */
    wdqs_query?: string;

    /** SPARQL query used to fetch the features from Wikidata through QLever */
    qlever_wd_query?: string;

    /** SPARQL query used to fetch the features from OpenStreetMap through QLever */
    qlever_osm_query?: string;

    /** OverpassQL query used to fetch the features */
    overpass_query?: string;

    /** Postpass SQL query used to fetch the features */
    postpass_query?: string;

    /** Whether this is a partial result because a part of the query returned an error */
    partial?: boolean;

    /**
     * Which (if any) OpenStreetMap instance is the original source of this data
     * @example "openstreetmap.org"
     * @example "openhistoricalmap.org"
     */
    osmInstance?: string;

    /** Whether the response has been truncated due to the maximum number of features being reached */
    truncated?: boolean;

    /** Language code that was used to fetch the features */
    language?: string;

    /** Year that was used to filter the features (relevant only if fetching from sources with start and end dates like OpenHistoricalMap) */
    year?: number;
}

export function osmKeyToKeyID(key: string) {
    return "osm_" + key.replace(":wikidata", "").replace(":", "_");
}

export function getFeatureLinkedEntities(f: OwmfFeature): LinkedEntity[] {
    let props;
    if (f.properties) {
        props = f.properties;
    } else {
        props = {};
        f.properties = props;
    }
    return getPropLinkedEntities(props);
}

/**
 * Returns the tags of a feature, if available, without side effects
 */
export function getFeatureTags(f: OwmfFeature): OsmFeatureTags | undefined {
    return f.properties ? getPropTags(f.properties) : undefined;
}

/**
 * Returns the tags of a feature, creating an empty oject if they are missing
 */
export function createFeatureTags(f: OwmfFeature): OsmFeatureTags {
    if (!f.properties) {
        f.properties = { tags: {} };
    }
    return createPropTags(f.properties)
}
