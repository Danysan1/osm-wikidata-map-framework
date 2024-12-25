import { Feature, FeatureCollection, Geometry } from "geojson";
import { Etymology } from "./Etymology";
import { FeatureTags, getPropLinkedEntities, getPropTags, OwmfFeatureProperties } from "./OwmfFeatureProperties";

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
     *  - pmtiles_osm_wikidata_direct
     *  - pmtiles_osm_wikidata_reverse
     *  - pmtiles_propagated
     *  - overpass_wd
     *  - overpass_all
     *  - overpass_osm_name_etymology
     *  - wd_base
     *  - wd_direct
     *  - wd_indirect
     *  - wd_qualifier
     *  - wd_reverse
     *  - overpass_wd+wd_direct
     *  - qlever_osm_wd
     *  - qlever_osm_all
     *  - qlever_osm_name_etymology
     *  - qlever_wd_direct
     *  - qlever_wd_indirect 
     *  - qlever_wd_qualifier
     *  - qlever_wd_reverse
     *  - qlever_osm_wd_base
     *  - qlever_osm_wikidata_direct
     *  - qlever_osm_wikidata_reverse
     */
    backEndID?: string;
    onlyCentroids?: boolean;
    /**
     * ISO string for the time the query was run
     */
    timestamp?: string;
    /**
     * Total number of entities linked to the features
     */
    total_entity_count?: number;
    /**
     * SPARQL query used to fetch the features from Wikidata Query Service
     */
    wdqs_query?: string;
    /**
     * SPARQL query used to fetch the features from Wikidata through QLever
     */
    qlever_wd_query?: string;
    /**
     * SPARQL query used to fetch the features from OpenStreetMap through QLever
     */
    qlever_osm_query?: string;
    /**
     * OverpassQL query used to fetch the features
     */
    overpass_query?: string;
    /**
     * Whether the response has been truncated due to the maximum number of features being reached
     */
    truncated?: boolean;
    /**
     * Language fetched
     */
    language?: string;
}

export function osmKeyToKeyID(key: string) {
    return "osm_" + key.replace(":wikidata", "").replace(":", "_");
}

export function getFeatureLinkedEntities(f: OwmfFeature): Etymology[] {
    let props;
    if (f.properties) {
        props = f.properties;
    } else {
        props = {};
        f.properties = props;
    }
    return getPropLinkedEntities(props);
}

export function getFeatureTags(f: OwmfFeature): FeatureTags {
    let props;
    if (f.properties) {
        props = f.properties;
    } else {
        props = {};
        f.properties = props;
    }
    return getPropTags(props);
}
