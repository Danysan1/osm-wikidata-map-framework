import { ColorSchemeID } from "../colorScheme.model";
import typeStatsQuery from "./query/stats/type.sparql";
import genderStatsQuery from "./query/stats/gender.sparql";
import countryStatsQuery from "./query/stats/country.sparql";
import startCenturyStatsQuery from "./query/stats/start-century.sparql";
import endCenturyStatsQuery from "./query/stats/end-century.sparql";
import { WikidataService } from "./WikidataService";
import { parse } from "papaparse";
import { EtymologyStat } from "../controls/EtymologyColorControl";
import { debug } from "../config";
import { StatsDatabase } from "../db/StatsDatabase";

const statsCSVPaths: Partial<Record<ColorSchemeID, string>> = {
    type: "csv/wikidata_types.csv",
    gender: "csv/wikidata_genders.csv",
    country: "csv/wikidata_countries.csv",
}

export const statsQueries: Partial<Record<ColorSchemeID, string>> = {
    type: typeStatsQuery,
    gender: genderStatsQuery,
    country: countryStatsQuery,
    startCentury: startCenturyStatsQuery,
    endCentury: endCenturyStatsQuery,
}

export class WikidataStatsService extends WikidataService {
    private db: StatsDatabase;

    public constructor() {
        super();
        this.db = new StatsDatabase();
    }

    async fetchStats(wikidataIDs: string[], colorSchemeID: ColorSchemeID): Promise<EtymologyStat[]> {
        let out = await this.db.getStats(colorSchemeID, wikidataIDs, this.language);
        if (out) {
            if (debug) console.info("Wikidata stats cache hit, using cached response", { wikidataIDs, colorSchemeID, out });
        } else {
            if (debug) console.info("Wikidata stats cache miss, fetching data", { wikidataIDs, colorSchemeID });
            const csvPath = statsCSVPaths[colorSchemeID],
                sparqlQuery = statsQueries[colorSchemeID];
            if (!sparqlQuery)
                throw new Error("downloadChartData: can't download data for a color scheme with no query - " + colorSchemeID);
            const res = await this.etymologyIDsQuery(wikidataIDs, sparqlQuery);
            let csvData: string[][] | undefined;
            if (csvPath) {
                const csvResponse = await fetch(csvPath),
                    csvText = await csvResponse.text();
                csvData = parse(csvText, { download: false, header: false }).data as string[][];
                // console.info("Loaded CSV:")
                // console.table(csvData);
            }
            out = res?.results?.bindings?.map((x: any): EtymologyStat => {
                if (!x.count?.value || !x.name?.value) {
                    if (debug) console.info("Empty count or name", x);
                    throw new Error("Invalid response from Wikidata (empty count or name)");
                }
                return {
                    name: x.name.value,
                    count: parseInt(x.count.value),
                    id: x.id?.value,
                    class: x.class?.value,
                    subjects: x.subjects?.value?.split(","),
                    color: x.color?.value || csvData?.find(row => row[0] === x.id?.value || row[0] === x.class?.value)?.at(3),
                };
            }) as EtymologyStat[];
            this.db.addStats(out, colorSchemeID, wikidataIDs, this.language);
        }
        return out;
    }
}