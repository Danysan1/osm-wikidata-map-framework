import type { StatsDatabase } from "@/src/db/StatsDatabase";
import { parse } from "papaparse";
import type { EtymologyStat } from "../../model/EtymologyStat";
import { ColorSchemeID } from "../../model/colorScheme";
import { WikidataService } from "../WikidataService";

const COLOR_SCHEMES_WITH_CSV: ColorSchemeID[] = [
    ColorSchemeID.type,
    ColorSchemeID.gender,
    ColorSchemeID.country,
    ColorSchemeID.occupation,
    ColorSchemeID.field_of_work,
];

const fetchSparqlQuery = (type: ColorSchemeID) => fetch(
    `${process.env.NEXT_PUBLIC_OWMF_base_path ?? ""}/wdqs/stats/${type}.sparql`,
    { cache: "force-cache" }
).then(r => {
    if (r.status !== 200) throw new Error("Failed fetching SPARQL template from " + r.url);
    return r.text();
});
const fetchCsvFile = (type: ColorSchemeID) => fetch(
    `${process.env.NEXT_PUBLIC_OWMF_base_path ?? ""}/csv/${type}.csv`,
    { cache: "force-cache" }
).then(r => {
    if (r.status !== 200) throw new Error("Failed fetching CSV file from " + r.url);
    return r.text();
});

export class WikidataStatsService extends WikidataService {
    private readonly db?: StatsDatabase;
    private readonly language: string;
    private readonly resolveQuery: (type: ColorSchemeID) => Promise<string>;
    private readonly resolveCSV: (type: ColorSchemeID) => Promise<string>;

    public constructor(
        language: string,
        db?: StatsDatabase,
        resolveQuery = fetchSparqlQuery,
        resolveCSV = fetchCsvFile) {
        super();
        this.db = db;
        this.language = language.split("_")[0]; // Ignore country
        this.resolveQuery = resolveQuery;
        this.resolveCSV = resolveCSV;
    }

    async fetchStats(wikidataIDs: string[], colorSchemeID: ColorSchemeID): Promise<EtymologyStat[]> {
        let out = await this.db?.getStats(colorSchemeID, wikidataIDs, this.language);
        if (out) {
            console.debug("Wikidata stats cache hit, using cached response", { wikidataIDs, colorSchemeID, out });
        } else {
            console.debug("Wikidata stats cache miss, fetching data", { wikidataIDs, colorSchemeID });
            const sparqlQueryTemplate = await this.resolveQuery(colorSchemeID),
                res = await this.etymologyIDsQuery(this.language, wikidataIDs, sparqlQueryTemplate);
            let csvData: string[][] | undefined;
            if (COLOR_SCHEMES_WITH_CSV.includes(colorSchemeID)) {
                const csvText = await this.resolveCSV(colorSchemeID);
                csvData = parse(csvText, { download: false, header: false }).data as string[][];
                // console.info("Loaded CSV:")
                // console.table(csvData);
            }
            out = res.results?.bindings?.map((x): EtymologyStat => {
                if (!x.count?.value || !x.name?.value) {
                    console.debug("Empty count or name", x);
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
            void this.db?.addStats(out, colorSchemeID, wikidataIDs, this.language);
        }
        return out;
    }
}