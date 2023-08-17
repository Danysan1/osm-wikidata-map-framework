import { ColorSchemeID } from "../colorScheme.model";
import typeStatsQuery from "./query/type-stats.sparql";
import genderStatsQuery from "./query/gender-stats.sparql";
import countryStatsQuery from "./query/country-stats.sparql";
import startCenturyStatsQuery from "./query/start-century-stats.sparql";
import endCenturyStatsQuery from "./query/end-century-stats.sparql";
import { WikidataService } from "./WikidataService";
import { parse } from "papaparse";
import { EtymologyStat } from "../generated/owmf";

export const statsCSVPaths: Record<ColorSchemeID, string | null> = {
    blue: null,
    source: null,
    black: null,
    red: null,
    orange: null,
    type: "csv/wikidata_types.csv",
    gender: "csv/wikidata_genders.csv",
    country: "csv/wikidata_countries.csv",
    startCentury: null,
    endCentury: null,
}

export const statsQueries: Record<ColorSchemeID, string | null> = {
    blue: null,
    source: null,
    black: null,
    red: null,
    orange: null,
    type: typeStatsQuery,
    gender: genderStatsQuery,
    country: countryStatsQuery,
    startCentury: startCenturyStatsQuery,
    endCentury: endCenturyStatsQuery,
}

export class StatsService {
    async fetchStats(wikidataIDs: string[], colorSchemeID: ColorSchemeID): Promise<EtymologyStat[]> {
        const csvPath = statsCSVPaths[colorSchemeID],
            sparqlQuery = statsQueries[colorSchemeID];
        if (!sparqlQuery)
            throw new Error("downloadChartData: can't download data for a color scheme with no query - " + colorSchemeID);
        const res = await new WikidataService().etymologyIDsQuery(wikidataIDs, sparqlQuery),
            stats = res?.results?.bindings?.map((x: any): EtymologyStat => {
                if (!x.count?.value || !x.name?.value)
                    throw new Error("Invalid response from Wikidata (empty count or name)");
                return {
                    color: x.color?.value,
                    count: parseInt(x.count.value),
                    id: x.id?.value?.replace("http://www.wikidata.org/entity/", ""),
                    name: x.name.value,
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
            stats.forEach(stat => stat.color = (csv.data as string[][]).find(row => row[0] === stat.id)?.at(3));
        }
        return stats;
    }
}