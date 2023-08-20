import { ColorSchemeID } from "../colorScheme.model";
import typeStatsQuery from "./query/stats/type.sparql";
import genderStatsQuery from "./query/stats/gender.sparql";
import countryStatsQuery from "./query/stats/country.sparql";
import startCenturyStatsQuery from "./query/stats/start-century.sparql";
import endCenturyStatsQuery from "./query/stats/end-century.sparql";
import { WikidataService } from "./WikidataService";
import { parse } from "papaparse";
import { EtymologyStat } from "../controls/EtymologyColorControl";
import { debugLog } from "../config";
import { logErrorMessage } from "../monitoring";
import { compress, decompress } from "lz-string";

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
    async fetchStats(wikidataIDs: string[], colorSchemeID: ColorSchemeID): Promise<EtymologyStat[]> {
        const cacheKey = `owmf.stats.${colorSchemeID}.${this.language}_${wikidataIDs.join("_")}`,
            cachedResponse = localStorage.getItem(cacheKey);
        let out: EtymologyStat[];
        if (cachedResponse) {
            out = JSON.parse(decompress(cachedResponse));
            debugLog("Cache hit, using cached response", { cacheKey, out });
        } else {
            debugLog("Cache miss, fetching data", { cacheKey });
            const csvPath = statsCSVPaths[colorSchemeID],
                sparqlQuery = statsQueries[colorSchemeID];
            if (!sparqlQuery)
                throw new Error("downloadChartData: can't download data for a color scheme with no query - " + colorSchemeID);
            const res = await this.etymologyIDsQuery(wikidataIDs, sparqlQuery);
            out = res?.results?.bindings?.map((x: any): EtymologyStat => {
                if (!x.count?.value || !x.name?.value) {
                    debugLog("Empty count or name", x);
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
            try {
                localStorage.setItem(cacheKey, compress(JSON.stringify(out)));
            } catch (e) {
                logErrorMessage("Failed to store stats data in cache", "warning", { cacheKey, out, e });
            }
        }
        return out;
    }
}