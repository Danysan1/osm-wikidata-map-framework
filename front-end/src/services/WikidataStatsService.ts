import { parse } from "papaparse";
import type { EtymologyStat } from "../controls/EtymologyColorControl";
import { StatsDatabase } from "../db/StatsDatabase";
import { getLanguage } from "../i18n";
import type { ColorSchemeID } from "../model/colorScheme";
import { WikidataService } from "./WikidataService";
import countryStatsQuery from "./query/stats/country.sparql";
import endCenturyStatsQuery from "./query/stats/end-century.sparql";
import genderStatsQuery from "./query/stats/gender.sparql";
import occupationStatsQuery from "./query/stats/occupation.sparql";
import pictureStatsQuery from "./query/stats/picture.sparql";
import startCenturyStatsQuery from "./query/stats/start-century.sparql";
import typeStatsQuery from "./query/stats/type.sparql";
import wikilinkStatsQuery from "./query/stats/wikilink.sparql";

const statsCSVPaths: Partial<Record<ColorSchemeID, string>> = {
    type: "csv/wikidata_types.csv",
    gender: "csv/wikidata_genders.csv",
    country: "csv/wikidata_countries.csv",
    occupation: "csv/wikidata_occupations.csv",
}

export const statsQueries: Partial<Record<ColorSchemeID, string>> = {
    picture: pictureStatsQuery,
    feature_link_count: wikilinkStatsQuery,
    type: typeStatsQuery,
    gender: genderStatsQuery,
    country: countryStatsQuery,
    occupation: occupationStatsQuery,
    startCentury: startCenturyStatsQuery,
    endCentury: endCenturyStatsQuery,
    etymology_link_count: wikilinkStatsQuery,
}

export class WikidataStatsService extends WikidataService {
    private readonly db: StatsDatabase;

    public constructor() {
        super();
        const maxHours = parseInt(process.env.owmf_cache_timeout_hours ?? "24");
        this.db = new StatsDatabase(maxHours);
    }

    async fetchStats(wikidataIDs: string[], colorSchemeID: ColorSchemeID): Promise<EtymologyStat[]> {
        const language = getLanguage();
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
            out = res.results?.bindings?.map((x): EtymologyStat => {
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
                    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                    color: x.color?.value || csvData?.find(row => row[0] === entityID || row[0] === classID)?.at(3),
                };
            }) ?? [];
            void this.db.addStats(out, colorSchemeID, wikidataIDs, language);
        }
        return out;
    }
}