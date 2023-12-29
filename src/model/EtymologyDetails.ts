import type { Etymology } from "./Etymology";

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

export interface EtymologyDetails extends Etymology {
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
    pictures?: string[];
    prizes?: string;
    start_date?: string;
    start_date_precision?: DatePrecision;
    wikipedia?: string;
    wkt_coords?: string;
}
