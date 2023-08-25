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

export const statsCSVPaths: Partial<Record<ColorSchemeID, string>> = {
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
            out = res?.results?.bindings?.map((x: any): EtymologyStat => {
                if (!x.count?.value || !x.name?.value) {
                    if (debug) console.info("Empty count or name", x);
                    throw new Error("Invalid response from Wikidata (empty count or name)");
                }
                return {
                    color: x.color?.value,
                    count: parseInt(x.count.value),
                    id: x.id?.value,
                    name: x.name.value,
                    subjects: x.subjects?.value?.split(","),
                };
            }) as EtymologyStat[];
            if (csvPath) {
                const csvResponse = await fetch(csvPath),
                    csvText = await csvResponse.text(),
                    csv = parse(csvText, { download: false, header: false });
                // console.info("Loaded CSV:")
                // console.table(csv.data);
                // console.info("Applying to stats:")
                // console.table(stats);
                out.forEach(stat => stat.color = (csv.data as string[][]).find(row => row[0] === stat.id)?.at(3));
            }
            this.db.addStats(out, colorSchemeID, wikidataIDs, this.language);
        }
        return out;
    }
}