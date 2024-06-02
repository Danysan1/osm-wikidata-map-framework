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

/**
 * Extended details for the subject of an etymology.
 */
export interface EtymologyDetails extends Etymology {
    /**
     * Q-ID of an alias Wikidata entity (which redirects to the main entity through owl:sameAs)
     */
    alias?: string;
    birth_date?: string;
    birth_date_precision?: DatePrecision;
    birth_place?: string;
    /**
     * Localized name of the country of citizenship
     */
    citizenship?: string;
    /**
     * Name of the Wikimedia Commons category
     */
    commons?: string;
    death_date?: string;
    death_date_precision?: DatePrecision;
    /**
     * Localized name of the place of death
     */
    death_place?: string;
    /**
     * Localized description of the subject
     */
    description?: string;
    end_date?: string;
    end_date_precision?: DatePrecision;
    event_date?: string;
    event_date_precision?: DatePrecision;
    /**
     * Localized name of the location of the event
     */
    event_place?: string;
    /**
     * Q-ID of the Wikidata entity of the gender
     */
    genderID?: string;
    /**
     * Localized name of the gender
     */
    gender?: string;
    /**
     * Q-ID of the Wikidata entity of the instance
     */
    instanceID?: string;
    /**
     * Localized name of the instance
     */
    instance?: string;
    /**
     * Localized name of the subject
     */
    name?: string;
    /**
     * Localized list of occupations (job/vocation/...)
     */
    occupations?: string;
    /**
     * Title of some Wikimedia Commons pictures about the subject
     */
    pictures?: string[];
    /**
     * Localized list of notable prizes received by the subject
     */
    prizes?: string;
    start_date?: string;
    start_date_precision?: DatePrecision;
    /**
     * Title of a Wikipedia page about the subject, prefixed with its language code (<language>:<Page name>)
     */
    wikipedia?: string;
    /**
     * Title of a Wikispore page about the subject
     */
    wikispore?: string;
    /**
     * Coordinates of the location of the subject
     */
    wkt_coords?: string;
}
