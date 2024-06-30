import detailsQuery from "raw-loader!./query/etymology-details.sparql";
import { DetailsDatabase } from "../db/DetailsDatabase";
import { getLanguage } from "../i18n/client";
import type { EtymologyDetails } from "../model/EtymologyDetails";
import { WikidataService } from "./WikidataService";

export class WikidataDetailsService extends WikidataService {
    private readonly db: DetailsDatabase;

    public constructor() {
        super();
        const maxHours = parseInt(process.env.owmf_cache_timeout_hours ?? "24");
        this.db = new DetailsDatabase(maxHours);
    }

    public async fetchEtymologyDetails(wikidataIDs: Set<string>): Promise<Record<string, EtymologyDetails>> {
        const language = getLanguage();
        let out = await this.db.getDetails(wikidataIDs, language);
        if (out) {
            if (process.env.NODE_ENV === 'development') console.debug("fetchEtymologyDetails: Cache hit, using cached response", { language, wikidataIDs, out });
        } else {
            if (process.env.NODE_ENV === 'development') console.debug("fetchEtymologyDetails: Cache miss, fetching data", { language, wikidataIDs });
            const res = await this.etymologyIDsQuery(language, Array.from(wikidataIDs), detailsQuery);

            if (!res?.results?.bindings?.length) {
                console.warn("fetchEtymologyDetails: no results");
                return {};
            }

            out = res.results.bindings.reduce((acc: Record<string, EtymologyDetails>, row): Record<string, EtymologyDetails> => {
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

                const details: EtymologyDetails = {
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
                    instance: row.instance?.value,
                    instanceID: row.instanceID?.value?.replace(WikidataService.WD_ENTITY_PREFIX, ""),
                    name: row.name?.value,
                    occupations: row.occupations?.value,
                    pictures: row.pictures?.value?.split("||"),
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

                return acc;
            }, {});
            try {
                if (process.env.NODE_ENV === 'development') console.debug("fetchEtymologyDetails: Finished fetching, saving cache", { language, wikidataIDs, out });
                void this.db.addDetails(out, wikidataIDs, language);
            } catch (e) {
                console.warn("Failed to store details data in cache", { language, wikidataIDs, out, e });
            }
        }
        return out;
    }
}
