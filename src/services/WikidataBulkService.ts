import { WikidataService } from "./WikidataService";
import { Connection, DataTypeOIDs, PreparedStatement } from 'postgresql-client';
import elementQuery from "./query/loadRelated/element.sql";
import wikidataQuery from "./query/loadRelated/wikidata.sql";

const SLEEP_TIME_MS = 5_000;

export class WikidataBulkService extends WikidataService {
    async loadRelatedEntities(sparqlQueryTemplate: string, etymologySqlQuery: string, dbConnectionURI: string) {
        console.info("Setting up connections...")
        const dbConnection = new Connection(dbConnectionURI);
        console.debug("Connected:", dbConnectionURI, dbConnection.config);
        await dbConnection.connect();
        await dbConnection.startTransaction(); // Airflow tasks should be atomic

        try {
            console.info("Preparing element query:\n", elementQuery);
            const elementStatement = await dbConnection.prepare(elementQuery, { paramTypes: [DataTypeOIDs.json] });
            console.info("Preparing wikidata query:\n", wikidataQuery);
            const wikidataStatement = await dbConnection.prepare(wikidataQuery, { paramTypes: [DataTypeOIDs.json] });
            console.info("Preparing etymology query:\n", etymologySqlQuery);
            const etymologyStatement = await dbConnection.prepare(etymologySqlQuery, { paramTypes: [DataTypeOIDs.json] });

            console.debug("Using SPARQL query:\n", sparqlQueryTemplate);
            for (let pageNumber = 0; pageNumber < 10; pageNumber++) {
                const sparqlQuery = sparqlQueryTemplate.replace('${pageNumber}', pageNumber.toString());
                console.debug(`Fetching elements and linked entities for page ${pageNumber}...`);
                try {
                    await this.loadRelatedEntitiesPage(sparqlQuery, elementStatement, wikidataStatement, etymologyStatement);
                } catch (e) {
                    console.log(`First attempt for page ${pageNumber} failed, sleeping and trying again...`, e);
                    await new Promise(resolve => setTimeout(resolve, SLEEP_TIME_MS));
                    await this.loadRelatedEntitiesPage(sparqlQuery, elementStatement, wikidataStatement, etymologyStatement);
                }
                console.debug(`Fetched and loaded elements and linked entities for page ${pageNumber}...`);

                //await new Promise(resolve => setTimeout(resolve, SLEEP_TIME_MS));
            };

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
        console.time("fetch");
        const response = await this.api.postSparqlQueryRaw({ backend: "sparql", format: "json", query: sparqlQuery }),
            json = await response.raw.text();
        console.timeEnd("fetch");
        console.debug(`Fetched data, loading Wikidata entities...`);

        try {
            console.time("wikidataLoad");
            const wikidataResult = await wikidataStatement.execute({ params: [json] });
            console.timeEnd("wikidataLoad");
            console.debug(`Loaded ${wikidataResult.rowsAffected || 0} wikidata entities, loading elements...`);

            console.time("elementLoad");
            const elementResult = await elementStatement.execute({ params: [json] });
            console.timeEnd("elementLoad");
            console.debug(`Loaded ${elementResult.rowsAffected || 0} elements, loading etymologies...`);

            console.time("etymologyLoad");
            const etymologyResult = await etymologyStatement.execute({ params: [json] });
            console.timeEnd("etymologyLoad");
            console.debug(`Loaded ${etymologyResult.rowsAffected || 0} etymologies`);

            return (elementResult.rowsAffected || 0) + (wikidataResult.rowsAffected || 0) + (etymologyResult.rowsAffected || 0);
        } catch (e) {
            const fs = await import("fs");
            fs.writeFileSync('bad-output.json', json);
            throw e;
        }
    }
}