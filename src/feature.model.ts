interface DetailedImage {
    picture: string,
    attribution?: string,
}

export type ImageResponse = string | DetailedImage;

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

export interface EtymologyDetails {
    birth_date?: string;
    birth_date_precision?: DatePrecision;
    birth_place?: string;
    citizenship?: string;
    commons?: string;
    death_date?: string;
    death_date_precision?: DatePrecision;
    death_place?: string;
    description?: string;
    end_date?: string;
    end_date_precision?: DatePrecision;
    event_date?: string;
    event_date_precision?: DatePrecision;
    event_place?: string;
    genderID?: string;
    gender?: string;
    instanceID?: string;
    instance?: string;
    name?: string;
    occupations?: string;
    pictures?: ImageResponse[];
    prizes?: string;
    start_date?: string;
    start_date_precision?: DatePrecision;
    wikidata?: string;
    wikipedia?: string;
    wkt_coords?: string;
}

export interface Etymology extends EtymologyDetails {
    /** Internal ID for the etymology relation (unique within the request but may vary over time) */
    et_id?: number;
    /** Whether OpenStreetMap is the original source of this etymology */
    from_osm?: boolean;
    /** ID (unique only within its type) of the source OpenStreetMap element */
    from_osm_id?: number;
    /** Type (node/way/relation) of the source OpenStreetMap element */
    from_osm_type?: string;
    /** Q-ID of the etymology Wikidata entity that contained this entity, leading to the inclusion of this entity as well */
    from_parts_of_wikidata_cod?: string;
    /** Whether Wikidata is the original source of this etymology */
    from_wikidata?: boolean;
    /** Q-ID of the Wikidata entity representing the map element */
    from_wikidata_entity?: string;
    /** P-ID of the Wikidata property that links from the map element entity to this etymology entity */
    from_wikidata_prop?: string;
    /** Whether this etymology has been obtained through propagation */
    propagated?: boolean;
    /** Internal ID for the etymology Wikidata entity (unique within the request but may vary over time) */
    wd_id?: string;
}

export interface FeatureProperties {
    country_color?: string;
    alt_name?: string;
    official_name?: string;
    commons?: string;
    el_id?: number;
    etymologies: Etymology[] | string; // Even though it is received as an array, for some reason both Mapbox GL and MapLibre GL stringify it as JSON
    gender_color?: string;
    name?: string;
    osm_id?: number;
    osm_type?: string;
    picture?: string;
    source_color?: string;
    text_etymology?: string;
    text_etymology_descr?: string;
    type_color?: string;
    wikidata?: string;
    wikipedia?: string;
}
