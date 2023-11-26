import { WikidataBulkService } from './services/WikidataBulkService';
import directMapQuery from "./services/query/loadRelated/direct.sparql";

const type: string = process.argv[2] || "direct",
    queryMap: Record<string, string> = {
        "direct": directMapQuery,
    };
if (!(type in queryMap))
    throw new Error("Invalid query type passed in first argument: " + type);

const jsonPropsList = process.argv[3] || process.env.owmf_osm_wikidata_properties,
    jsonProps = jsonPropsList ? JSON.parse(jsonPropsList) : null;
if (!Array.isArray(jsonProps))
    throw new Error("Invalid JSON passed in second argument (properties list): " + jsonPropsList);

const sparqlQuery: string = queryMap[type].replace("${properties}", jsonProps.map(prop => `wdt:${prop}`).join(" ")),
    db_connection_uri = process.argv[4] || process.env.owmf_db_uri;
if (!db_connection_uri)
    throw new Error("No DB connection URI passed (no third argument and no DB_CONNECTION_URI env variable)");

console.debug("Setting up services");
const wikidata_api = new WikidataBulkService();
wikidata_api.loadRelatedEntities(sparqlQuery, db_connection_uri);
