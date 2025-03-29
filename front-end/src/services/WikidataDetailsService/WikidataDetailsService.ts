import { DetailsDatabase } from "../../db/DetailsDatabase";
import type { LinkedEntityDetails } from "../../model/LinkedEntityDetails";
import { WikidataService } from "../WikidataService";

export class WikidataDetailsService extends WikidataService {
    private readonly db?: DetailsDatabase;
    private readonly language: string;
    private readonly resolveQuery: () => Promise<string>;

    public constructor(language: string, db?: DetailsDatabase, resolveQuery?: () => Promise<string>) {
        super();
        this.db = db;
        this.language = language;
        this.resolveQuery = resolveQuery ?? (
            () => fetch(`/wdqs/entity-details.sparql`).then(r => r.text())
        );
    }

    public async fetchEtymologyDetails(wikidataIDs: Set<string> | string[]): Promise<Record<string, LinkedEntityDetails>> {
        if (Array.isArray(wikidataIDs))
            wikidataIDs = new Set(wikidataIDs);

        if (!wikidataIDs.size) {
            throw new Error("Empty Wikidata ID set", { cause: wikidataIDs });
        }

        wikidataIDs.forEach(id => {
            if (!id.startsWith("Q") || id === "Q")
                throw new Error("Invalid Wikidata ID", { cause: id });
        });

        let out = await this.db?.getDetails(wikidataIDs, this.language);
        if (out) {
            console.debug("fetchEtymologyDetails: Cache hit, using cached response", { lang: this.language, wikidataIDs });
        } else {
            console.debug("fetchEtymologyDetails: Cache miss, fetching data", { lang: this.language, wikidataIDs });
            const sparqlQueryTemplate = await this.resolveQuery(),
                res = await this.etymologyIDsQuery(this.language, Array.from(wikidataIDs), sparqlQueryTemplate);

            if (!res?.results?.bindings?.length) {
                console.warn("fetchEtymologyDetails: no results");
                return {};
            }

            out = res.results.bindings.reduce((acc: Record<string, LinkedEntityDetails>, row): Record<string, LinkedEntityDetails> => {
                const wdURI = row?.wikidata?.value;
                if (typeof wdURI !== "string")
                    throw new Error("Bad row (no Wikidata URI): ", row);

                const wdQID = wdURI.replace(WikidataService.WD_ENTITY_PREFIX, "");
                if (!wdQID.length)
                    throw new Error("Bad row (empty Wikidata QID): ", row);

                const parts = row.parts?.value
                    ?.split(";")
                    ?.map(id => id.replace(WikidataService.WD_ENTITY_PREFIX, ""))
                    ?.filter(id => id.length);

                if (!!row.name?.value || !!row.description?.value || !!row.instanceID?.value) {
                    const details: LinkedEntityDetails = {
                        alias: row.alias?.value?.replace(WikidataService.WD_ENTITY_PREFIX, ""),
                        birth_date: row.birth_date?.value,
                        birth_date_precision: row.birth_date_precision?.value ? parseInt(row.birth_date_precision.value) : undefined,
                        birth_place: row.birth_place?.value,
                        citizenship: row.citizenship?.value,
                        commons: row.commons?.value,
                        death_date: row.death_date?.value,
                        death_date_precision: row.death_date_precision?.value ? parseInt(row.death_date_precision.value) : undefined,
                        death_place: row.death_place?.value,
                        description: row.description?.value,
                        end_date: row.end_date?.value,
                        end_date_precision: row.end_date_precision?.value ? parseInt(row.end_date_precision.value) : undefined,
                        event_date: row.event_date?.value,
                        event_date_precision: row.event_date_precision?.value ? parseInt(row.event_date_precision.value) : undefined,
                        event_place: row.event_place?.value,
                        gender: row.gender?.value,
                        genderID: row.genderID?.value?.replace(WikidataService.WD_ENTITY_PREFIX, ""),
                        iiif_url: row.iiif?.value,
                        instance: row.instance?.value,
                        instanceID: row.instanceID?.value?.replace(WikidataService.WD_ENTITY_PREFIX, ""),
                        name: row.name?.value,
                        occupations: row.occupations?.value,
                        pictures: row.pictures?.value?.split("||")?.filter(p => p?.length),
                        prizes: row.prizes?.value,
                        start_date: row.start_date?.value,
                        start_date_precision: row.start_date_precision?.value ? parseInt(row.start_date_precision?.value) : undefined,
                        wikipedia: row.wikipedia?.value,
                        wikispore: row.wikispore?.value,
                        wkt_coords: row.wkt_coords?.value,
                        wikidata: wdQID,
                        parts,
                    };

                    acc[wdQID] = details;
                    if (details.alias?.length)
                        acc[details.alias] = details;
                }

                return acc;
            }, {});
            try {
                console.debug("fetchEtymologyDetails: Finished fetching, saving cache", { lang: this.language, wikidataIDs });
                void this.db?.addDetails(out, wikidataIDs, this.language);
            } catch (e) {
                console.warn("Failed to store details data in cache", { lang: this.language, wikidataIDs, out, e });
            }
        }
        return out;
    }
}
