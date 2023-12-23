import { WikidataBulkService } from './services/WikidataBulkService';
import directMapQuery from "./services/query/loadRelated/direct-map.sparql";
import directEtymologyQuery from "./services/query/loadRelated/direct-etymology.sql";

const type: string = process.argv[2] || "direct",
    sparqlQueryMap: Record<string, string> = {
        "direct": directMapQuery,
    },
    etymologyQueryMap: Record<string, string> = {
        "direct": directEtymologyQuery,
    };
if (!(type in sparqlQueryMap && type in etymologyQueryMap))
    throw new Error("Invalid query type passed in first argument: " + type);

const jsonPropsList = process.argv[3] || process.env.owmf_osm_wikidata_properties,
    jsonProps = jsonPropsList ? JSON.parse(jsonPropsList) : null;
if (!Array.isArray(jsonProps))
    throw new Error("Invalid JSON passed in second argument (properties list): " + jsonPropsList);

const sparqlQuery = sparqlQueryMap[type].replace("${properties}", jsonProps.map(prop => `wdt:${prop}`).join(" ")),
    etymologyQuery = etymologyQueryMap[type],
    db_connection_uri = process.argv[4] || process.env.owmf_db_uri;
if (!db_connection_uri)
    throw new Error("No DB connection URI passed (no third argument and no DB_CONNECTION_URI env variable)");

const wikidata_country = process.env.owmf_wikidata_country || undefined;

console.debug("Setting up services");
const wikidata_api = new WikidataBulkService();
wikidata_api.loadRelatedEntities(
    sparqlQuery, etymologyQuery, db_connection_uri, wikidata_country
);
