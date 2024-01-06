import type { ColorSchemeID } from "../model/colorScheme";
import pictureStatsQuery from "./query/stats/picture.sparql";
import typeStatsQuery from "./query/stats/type.sparql";
import genderStatsQuery from "./query/stats/gender.sparql";
import countryStatsQuery from "./query/stats/country.sparql";
import occupationStatsQuery from "./query/stats/occupation.sparql";
import startCenturyStatsQuery from "./query/stats/start-century.sparql";
import endCenturyStatsQuery from "./query/stats/end-century.sparql";
import { WikidataService } from "./WikidataService";
import { parse } from "papaparse";
import type { EtymologyStat } from "../controls/EtymologyColorControl";
import { StatsDatabase } from "../db/StatsDatabase";

const statsCSVPaths: Partial<Record<ColorSchemeID, string>> = {
    type: "csv/wikidata_types.csv",
    gender: "csv/wikidata_genders.csv",
    country: "csv/wikidata_countries.csv",
    occupation: "csv/wikidata_occupations.csv",
}

export const statsQueries: Partial<Record<ColorSchemeID, string>> = {
    picture: pictureStatsQuery,
    type: typeStatsQuery,
    gender: genderStatsQuery,
    country: countryStatsQuery,
    occupation: occupationStatsQuery,
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
        const language = document.documentElement.lang.split('-').at(0) || '';
        let out = await this.db.getStats(colorSchemeID, wikidataIDs, language);
        if (out) {
            if (process.env.NODE_ENV === 'development') console.debug("Wikidata stats cache hit, using cached response", { wikidataIDs, colorSchemeID, out });
        } else {
            if (process.env.NODE_ENV === 'development') console.debug("Wikidata stats cache miss, fetching data", { wikidataIDs, colorSchemeID });
            const csvPath = statsCSVPaths[colorSchemeID],
                sparqlQuery = statsQueries[colorSchemeID];
            if (!sparqlQuery)
                throw new Error("downloadChartData: can't download data for a color scheme with no query - " + colorSchemeID);
            const res = await this.etymologyIDsQuery(language, wikidataIDs, sparqlQuery);
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
                    if (process.env.NODE_ENV === 'development') console.debug("Empty count or name", x);
                    throw new Error("Invalid response from Wikidata (empty count or name)");
                }
                const entityID = typeof x.id?.value === "string" ? x.id.value.replace(WikidataService.WD_ENTITY_PREFIX, '') : undefined,
                    classID = typeof x.class?.value === "string" ? x.class.value.replace(WikidataService.WD_ENTITY_PREFIX, '') : undefined;
                return {
                    name: x.name.value,
                    count: parseInt(x.count.value),
                    id: entityID,
                    class: classID,
                    subjects: x.subjects?.value?.split(","),
                    color: x.color?.value || csvData?.find(row => row[0] === entityID || row[0] === classID)?.at(3),
                };
            }) as EtymologyStat[];
            this.db.addStats(out, colorSchemeID, wikidataIDs, language);
        }
        return out;
    }
}