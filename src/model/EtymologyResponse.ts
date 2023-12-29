import { FeatureCollection, Geometry, Feature } from "geojson";
import { EtymologyFeatureProperties } from "./EtymologyFeatureProperties";

export type EtymologyResponseFeatureProperties = EtymologyFeatureProperties | null;

export type EtymologyFeature = Feature<Geometry, EtymologyResponseFeatureProperties>;

export interface EtymologyResponse extends FeatureCollection<Geometry, EtymologyResponseFeatureProperties> {
    /**
     * ID of the source of the features
     */
    sourceID?: string;
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
