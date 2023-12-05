import { WikidataService } from "./WikidataService";
import { Connection, DataTypeOIDs, PreparedStatement } from 'postgresql-client';
import elementUpdateQuery from "./query/loadRelated/element-update.sql";
import elementInsertQuery from "./query/loadRelated/element-insert.sql";
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
            console.info("Preparing wikidata query:\n", wikidataQuery);
            const wikidataStatement = await dbConnection.prepare(wikidataQuery, { paramTypes: [DataTypeOIDs.json] });
            console.info("Preparing element update query:\n", elementUpdateQuery);
            const elementUpdateStatement = await dbConnection.prepare(elementUpdateQuery);
            console.info("Preparing element insert query:\n", elementInsertQuery);
            const elementInsertStatement = await dbConnection.prepare(elementInsertQuery, { paramTypes: [DataTypeOIDs.json] });
            console.info("Preparing etymology query:\n", etymologySqlQuery);
            const etymologyStatement = await dbConnection.prepare(etymologySqlQuery, { paramTypes: [DataTypeOIDs.json] });

            console.debug("Using SPARQL query:\n", sparqlQueryTemplate);
            for (let pageNumber = 0; pageNumber < 10; pageNumber++) {
                const sparqlQuery = sparqlQueryTemplate.replace('${pageNumber}', pageNumber.toString());
                console.debug(`Fetching elements and linked entities for page ${pageNumber}...`);
                try {
                    await this.loadRelatedEntitiesPage(sparqlQuery, wikidataStatement, elementUpdateStatement, elementInsertStatement, etymologyStatement);
                } catch (e) {
                    console.log(`First attempt for page ${pageNumber} failed, sleeping and trying again...`, e);
                    await new Promise(resolve => setTimeout(resolve, SLEEP_TIME_MS));
                    await this.loadRelatedEntitiesPage(sparqlQuery, wikidataStatement, elementUpdateStatement, elementInsertStatement, etymologyStatement);
                }
                console.debug(`Fetched and loaded elements and linked entities for page ${pageNumber}...`);

                //await new Promise(resolve => setTimeout(resolve, SLEEP_TIME_MS));
            };

            console.debug("Tearing down connections...");
            await wikidataStatement.close();
            await elementUpdateStatement.close();
            await elementInsertStatement.close();
            await etymologyStatement.close();
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
        wikidataStatement: PreparedStatement, // Adds the wikidata entities to the wikidata table
        elementUpdateStatement: PreparedStatement, // Updates osm_wd_id of elements in the osmdata table
        elementInsertStatement: PreparedStatement, // Adds the elements to the osmdata table
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
            console.debug(`Loaded ${wikidataResult.rowsAffected || 0} wikidata entities, updating elements...`);

            console.time("elementUpdate");
            const elementUpdateResult = await elementUpdateStatement.execute();
            console.timeEnd("elementUpdate");
            console.debug(`Updated ${elementUpdateResult.rowsAffected || 0} elements, inserting elements...`);

            console.time("elementInsert");
            const elementInsertResult = await elementInsertStatement.execute({ params: [json] });
            console.timeEnd("elementInsert");
            console.debug(`Inserted ${elementInsertResult.rowsAffected || 0} elements, loading etymologies...`);

            console.time("etymologyLoad");
            const etymologyResult = await etymologyStatement.execute({ params: [json] });
            console.timeEnd("etymologyLoad");
            console.debug(`Loaded ${etymologyResult.rowsAffected || 0} etymologies`);

            return (wikidataResult.rowsAffected || 0) + (elementUpdateResult.rowsAffected || 0) + (elementInsertResult.rowsAffected || 0) + (etymologyResult.rowsAffected || 0);
        } catch (e) {
            const fs = await import("fs");
            fs.writeFileSync('bad-output.json', json);
            throw e;
        }
    }
}