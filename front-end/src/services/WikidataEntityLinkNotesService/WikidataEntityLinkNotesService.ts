import type { EntityLinkNotesDatabase } from "@/src/db/EntityLinkNotesDatabase";
import type { EntityLinkNotes } from "../../model/LinkedEntity";
import { WikidataService } from "../WikidataService";

export class WikidataEntityLinkNotesService extends WikidataService {
    private readonly db?: EntityLinkNotesDatabase;
    private readonly language: string;
    private readonly resolveQuery: () => Promise<string>;

    public constructor(language: string, db?: EntityLinkNotesDatabase, resolveQuery?: () => Promise<string>) {
        super();
        this.db = db;
        this.language = language.split("_")[0]; // Ignore country
        this.resolveQuery = resolveQuery ?? (
            () => fetch(`/wdqs/entityLinkNotes.sparql`).then(r => r.text())
        );
    }

    public async fetchEntityLinkNotes(featureQID: string, propertyPID: string, linkedEntityQID: string): Promise<EntityLinkNotes | undefined> {
        if (!featureQID.startsWith("Q") || featureQID === "Q")
            throw new Error("Invalid feature Q-ID", { cause: featureQID });
        if (!propertyPID.startsWith("P") || propertyPID === "P")
            throw new Error("Invalid entity link P-ID", { cause: propertyPID });
        if (!linkedEntityQID.startsWith("Q") || linkedEntityQID === "Q")
            throw new Error("Invalid linked entity Q-ID", { cause: linkedEntityQID });

        let out = await this.db?.getEntityLinkNotes(featureQID, propertyPID, linkedEntityQID, this.language);
        if (out) {
            console.debug("fetchEntityLinkNotes: Cache hit, using cached response", { lang: this.language, featureQID, linkedEntityQID, out });
        } else {
            console.debug("fetchEntityLinkNotes: Cache miss, fetching data", { lang: this.language, featureQID, linkedEntityQID });
            const sparqlQueryTemplate = await this.resolveQuery(),
                sparqlQuery = sparqlQueryTemplate
                    .replaceAll('${featureQID}', featureQID)
                    .replaceAll('${linkedEntityQID}', linkedEntityQID)
                    .replaceAll('${propertyPID}', propertyPID)
                    .replaceAll('${language}', this.language);
            // console.log(sparqlQuery)
            const res = await this.api.postSparqlQuery("sparql", sparqlQuery, "json");

            if (!res?.data?.results?.bindings?.length) {
                console.warn("fetchEntityLinkNotes: no results");
                out = undefined;
            } else {
                out = {
                    entityQID: res.data.results.bindings[0].entity?.value?.replace(WikidataService.WD_ENTITY_PREFIX, ""),
                    languages: res.data.results.bindings[0].languages?.value,
                };
            }
            try {
                console.debug("fetchEntityLinkNotes: Finished fetching, saving cache", { lang: this.language, featureQID, linkedEntityQID, out });
                void this.db?.addEntityLinkNotes(featureQID, propertyPID, linkedEntityQID, this.language, out);
            } catch (e) {
                console.warn("Failed to store details data in cache", { lang: this.language, featureQID, linkedEntityQID, out, e });
            }
        }
        return out;
    }
}
