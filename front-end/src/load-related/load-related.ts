import { WikidataBulkService } from '../services/WikidataBulkService/WikidataBulkService';
import directEtymologyQuery from "./direct-etymology.sql";
import directMapQuery from "./direct-map.sparql";

if (process.env.NODE_ENV !== 'development')
    throw new Error("This is a reserved script to initialize the DB, enabled only in development mode");

const type: string = process.argv[2] || "direct",
    db_connection_uri = process.argv[4] || process.env.owmf_db_uri,
    sparqlQueryMap: Record<string, string> = {
        "direct": directMapQuery,
        // TODO indirect query
    },
    etymologyQueryMap: Record<string, string> = {
        "direct": directEtymologyQuery,
        // TODO indirect query
    };
if (!db_connection_uri)
    throw new Error("No DB connection URI passed (neither as parameter or db_uri env var)");
if (!(type in sparqlQueryMap))
    throw new Error("Query type not found in base SPARQL query map: " + type);
if (!(type in etymologyQueryMap))
    throw new Error("Query type not found in etymology SPARQL query map: " + type);

const rawJsonProps = process.argv[3] || process.env.owmf_osm_wikidata_properties,
    jsonProps: unknown = typeof rawJsonProps === "string" ? JSON.parse(rawJsonProps) : undefined;
if (!Array.isArray(jsonProps) || !jsonProps.length)
    throw new Error("Invalid JSON passed (in second argument or osm_wikidata_properties env var): " + rawJsonProps);

const jsonPropList = jsonProps.map(prop => {
    if (typeof prop === "string")
        return prop;
    else
        throw new Error("Non-string property in properties list: " + rawJsonProps);
}),
    sparqlQuery = sparqlQueryMap[type].replaceAll('${directPropertyValues}', jsonPropList.map(pID => `(p:${pID} ps:${pID})`).join(" ")),
    etymologyQuery = etymologyQueryMap[type];

// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
const wikidata_country = process.env.owmf_wikidata_country || undefined;

console.log("Setting up services");
const wikidata_api = new WikidataBulkService(false);


console.log("Running initialization", { db_connection_uri, wikidata_country });
void wikidata_api.loadRelatedEntities(
    sparqlQuery, etymologyQuery, db_connection_uri, wikidata_country
);

console.log("Loading completed")