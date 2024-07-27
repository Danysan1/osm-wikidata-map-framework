import { parse } from "papaparse";
import { StatsDatabase } from "../../db/StatsDatabase";
import type { EtymologyStat } from "../../model/EtymologyStat";
import type { ColorSchemeID } from "../../model/colorScheme";
import { WikidataService } from "../WikidataService";
import countryStatsQuery from "./country.sparql";
import endCenturyStatsQuery from "./end-century.sparql";
import genderStatsQuery from "./gender.sparql";
import occupationStatsQuery from "./occupation.sparql";
import pictureStatsQuery from "./picture.sparql";
import startCenturyStatsQuery from "./start-century.sparql";
import typeStatsQuery from "./type.sparql";
import wikilinkStatsQuery from "./wikilink.sparql";

const statsCSVPaths: Partial<Record<ColorSchemeID, string>> = {
    type: `${process.env.owmf_base_path ?? ""}/csv/wikidata_types.csv`,
    gender: `${process.env.owmf_base_path ?? ""}/csv/wikidata_genders.csv`,
    country: `${process.env.owmf_base_path ?? ""}/csv/wikidata_countries.csv`,
    occupation: `${process.env.owmf_base_path ?? ""}/csv/wikidata_occupations.csv`,
}

export const statsQueryURLs: Partial<Record<ColorSchemeID, string>> = {
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
    private readonly language: string;

    public constructor(language: string) {
        super();
        this.db = new StatsDatabase();
        this.language = language;

        const maxHours = parseInt(process.env.owmf_cache_timeout_hours ?? "24");
        setTimeout(() => void this.db.clearStats(maxHours), 10_000);
    }

    async fetchStats(wikidataIDs: string[], colorSchemeID: ColorSchemeID): Promise<EtymologyStat[]> {
        let out = await this.db.getStats(colorSchemeID, wikidataIDs, this.language);
        if (out) {
            if (process.env.NODE_ENV === 'development') console.debug("Wikidata stats cache hit, using cached response", { wikidataIDs, colorSchemeID, out });
        } else {
            if (process.env.NODE_ENV === 'development') console.debug("Wikidata stats cache miss, fetching data", { wikidataIDs, colorSchemeID });
            const csvPath = statsCSVPaths[colorSchemeID],
                sparqlQueryURL = statsQueryURLs[colorSchemeID];
            if (!sparqlQueryURL)
                throw new Error("downloadChartData: can't download data for a color scheme with no query - " + colorSchemeID);
            const sparqlQueryTemplate = await fetch(sparqlQueryURL).then(res => res.text()),
                res = await this.etymologyIDsQuery(this.language, wikidataIDs, sparqlQueryTemplate);
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
            void this.db.addStats(out, colorSchemeID, wikidataIDs, this.language);
        }
        return out;
    }
}