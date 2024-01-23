import { FeatureCollection, Geometry, Feature } from "geojson";
import { EtymologyFeatureProperties } from "./EtymologyFeatureProperties";

export type EtymologyResponseFeatureProperties = EtymologyFeatureProperties | null;

export type EtymologyFeature = Feature<Geometry, EtymologyResponseFeatureProperties>;

export interface EtymologyResponse extends FeatureCollection<Geometry, EtymologyResponseFeatureProperties> {
    /**
     * ID of the backEnd used to fetch the features
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
    /**
     * ISO string for the time the query was run
     */
    timestamp?: string;
    /**
     * Total number of etymologies linked to the features
     */
    etymology_count?: number;
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
