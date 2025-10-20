import type { DatePrecision, LinkedEntity } from "./LinkedEntity";

/**
 * Extended details for a linked entity.
 */
export interface LinkedEntityDetails extends LinkedEntity {
    /**
     * Localized name of the country of citizenship of the subject entity
     */
    citizenship?: string;
    
    /**
     * Name of the Wikimedia Commons category for the subject entity, beginning with Category:
     */
    commons?: string;
    
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

    iiif_url?: string;
    
    /**
     * Q-ID of the Wikidata entity of the instance
     */
    instanceID?: string;
    
    /**
     * Localized name of the instance
     */
    instance?: string;
    
    /**
     * Localized list of occupations (job/vocation/...)
     */
    occupations?: string;
    
    /**
     * Title of some Wikimedia Commons pictures about the subject entity
     */
    pictures?: string[];
    
    /**
     * Localized list of notable prizes received by the subject entity
     */
    prizes?: string;
    
    start_date?: string;
    start_date_precision?: DatePrecision;
    
    /**
     * Title of a Wikipedia page about the subject entity, prefixed with its language code (<language>:<Page name>)
     */
    wikipedia?: string;
    
    /**
     * Title of a Wikispore page about the subject entity
     */
    wikispore?: string;
    
    /**
     * Coordinates of the location of the subject entity
     */
    wkt_coords?: string;
}
