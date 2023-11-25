import { WikidataBulkService } from './services/WikidataBulkService';
import directMapQuery from "./services/query/loadRelated/direct.sparql";


const jsonPropsList = process.argv[2],
    jsonProps = jsonPropsList ? JSON.parse(jsonPropsList) : [];
if (!Array.isArray(jsonProps))
    throw new Error("Invalid JSON passed in first argument (properties list): " + jsonPropsList);

const queryMap: Record<string, string> = {
    "direct": directMapQuery,
},
    type: string = process.argv[3];
if (!(type in queryMap))
    throw new Error("Invalid query type passed in second argument: " + type);

const sparqlQuery: string = queryMap[type].replace("${properties}", jsonProps.map(prop => `wdt:${prop}`).join(" ")),
    db_connection_uri = process.argv[4] || process.env.DB_CONNECTION_URI;
if (!db_connection_uri)
    throw new Error("No DB connection URI passed (no third argument and no DB_CONNECTION_URI env variable)");

console.debug("Setting up services");
const wikidata_api = new WikidataBulkService();
wikidata_api.loadRelatedEntities(sparqlQuery, db_connection_uri);
