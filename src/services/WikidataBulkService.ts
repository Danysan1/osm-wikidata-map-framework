import { WikidataService } from "./WikidataService";
import { Connection, DataTypeOIDs, PreparedStatement } from 'postgresql-client';
import elementQuery from "./query/loadRelated/element.sql";
import wikidataQuery from "./query/loadRelated/wikidata.sql";
import etymologyQuery from "./query/loadRelated/etymology.sql";

const PAGE_SIZE = 400_000,
    SLEEP_TIME_MS = 5_000;

export class WikidataBulkService extends WikidataService {
    async loadRelatedEntities(sparqlQueryTemplate: string, dbConnectionURI: string) {
        console.info("Setting up connections...")
        const dbConnection = new Connection(dbConnectionURI);
        console.debug("Connected:", dbConnectionURI, dbConnection.config);
        await dbConnection.connect();
        await dbConnection.startTransaction(); // Airflow tasks should be atomic

        try {
            console.info("Preparing element query...");
            const elementStatement = await dbConnection.prepare(elementQuery, { paramTypes: [DataTypeOIDs.json] });
            console.info("Preparing wikidata query...");
            const wikidataStatement = await dbConnection.prepare(wikidataQuery, { paramTypes: [DataTypeOIDs.json] });
            console.info("Preparing etymology query...");
            const etymologyStatement = await dbConnection.prepare(etymologyQuery, { paramTypes: [DataTypeOIDs.json] });

            console.debug("Using query:", sparqlQueryTemplate);
            let offset = 0,
                lastLoadCount;
            // do {
                const sparqlQuery = sparqlQueryTemplate.replace('${limit}', `LIMIT ${PAGE_SIZE} OFFSET ${offset}`);
                console.debug(`Fetching ${PAGE_SIZE} elements for offset ${offset}...`);
                try {
                    lastLoadCount = await this.loadRelatedEntitiesPage(sparqlQuery, elementStatement, wikidataStatement, etymologyStatement);
                } catch (e) {
                    console.log(`First attempt for offset ${offset} failed, sleeping and trying again...`, e);
                    await new Promise(resolve => setTimeout(resolve, SLEEP_TIME_MS));
                    lastLoadCount = await this.loadRelatedEntitiesPage(sparqlQuery, elementStatement, wikidataStatement, etymologyStatement);
                }
                console.debug(`Loaded elements and etymologies, sleeping`);
                offset += PAGE_SIZE;
                // await new Promise(resolve => setTimeout(resolve, SLEEP_TIME_MS));
            // } while (lastLoadCount > 0);

            console.debug("Tearing down connections...");
            await etymologyStatement.close();
            await elementStatement.close();
            await dbConnection.commit();
            await dbConnection.close();
            console.info("Done!");
        } catch (e) {
            await dbConnection.rollback();
            await dbConnection.close();
            throw e;
        }
    }

    private async loadRelatedEntitiesPage(
        sparqlQuery: string, // The SPARQL query to fetch the related entities
        elementStatement: PreparedStatement, // Adds the elements to the osmdata table
        wikidataStatement: PreparedStatement, // Adds the wikidata entities to the wikidata table
        etymologyStatement: PreparedStatement // Adds the etymologies to the etymology table
    ): Promise<number> {
        const response = await this.api.postSparqlQueryRaw({ format: "json", query: sparqlQuery }),
            json = await response.raw.text();
        try {
            console.debug(`Loading elements...`);
            const elementResult = await elementStatement.execute({ params: [json] });
            console.debug(`Loaded ${elementResult.rowsAffected || 0} elements, loading wikidata entities...`);

            const wikidataResult = await wikidataStatement.execute({ params: [json] });
            console.debug(`Loaded ${wikidataResult.rowsAffected || 0} wikidata entities, loading etymologies...`);

            const etymologyResult = await etymologyStatement.execute({ params: [json] });
            console.debug(`Loaded ${etymologyResult.rowsAffected || 0} etymologies`);

            return (elementResult.rowsAffected || 0) + (wikidataResult.rowsAffected || 0) + (etymologyResult.rowsAffected || 0);
        } catch (e) {
            const fs = await import("fs");
            fs.writeFileSync('bad-output.json', json);
            throw e;
        }
    }
}