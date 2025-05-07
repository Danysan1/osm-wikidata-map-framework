import type { EntityLinkNotesDatabase } from "@/src/db/EntityLinkNotesDatabase";
import type { EntityLinkNote, LinkedEntity } from "../../model/LinkedEntity";
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

    public async fetchLinkedEntitiesLinkNotes(linkedEntities: LinkedEntity[]): Promise<Record<string, EntityLinkNote>> {
        const linksFromWiki = linkedEntities.filter(
            (e) =>
                !e.from_parts_of_wikidata_cod &&
                !e.propagated &&
                !!e.from_wikidata_entity &&
                !!e.from_wikidata_prop &&
                !!e.wikidata
        );
        if (!linksFromWiki.length) {
            console.debug("All entities are linked indirectly to the feature or not linked on Wikidata, no link statement to search", linkedEntities);
            return {};
        }

        const grouped = Object.groupBy(
            linksFromWiki,
            (e) => `${e.from_wikidata_entity}-${e.from_wikidata_prop}`
        );
        const results = await Promise.all(
            Object.entries(grouped).map(([, links]) => {
                const from_entity = links![0].from_wikidata_entity!,
                    from_prop = links![0].from_wikidata_prop!,
                    qids = new Set(links!.map((e) => e.wikidata!));

                return this.fetchEntitiesLinkNotes(from_entity, from_prop, qids);
            })
        );
        console.debug("fetchLinkedEntitiesLinkNotes result:", { linkedEntities, grouped, results });
        if (results.length === 1) return results[0];
        return results.reduce((acc, note) => Object.assign(acc, note), {});
    }

    public async fetchEntityLinkNotes(featureQID: string, propertyPID: string, linkedEntityQID: string): Promise<EntityLinkNote | undefined> {
        const dict = await this.fetchEntitiesLinkNotes(featureQID, propertyPID, new Set([linkedEntityQID]));
        return dict[linkedEntityQID];
    }

    public async fetchEntitiesLinkNotes(featureQID: string, propertyPID: string, linkedEntityQIDs: Set<string>): Promise<Record<string, EntityLinkNote>> {
        if (!featureQID.startsWith("Q") || featureQID === "Q")
            throw new Error("Invalid feature Q-ID", { cause: featureQID });
        if (!propertyPID.startsWith("P") || propertyPID === "P")
            throw new Error("Invalid entity link P-ID", { cause: propertyPID });
        if (!linkedEntityQIDs.size)
            throw new Error("No linked entity Q-IDs provided");
        linkedEntityQIDs.forEach(linkedEntityQID => {
            if (!linkedEntityQID.startsWith("Q") || linkedEntityQID === "Q")
                throw new Error("Invalid linked entity Q-ID", { cause: linkedEntityQID });
        });

        let out = await this.db?.getEntityLinkNotes(featureQID, propertyPID, linkedEntityQIDs, this.language);
        if (out) {
            console.debug("fetchEntityLinkNotes: Cache hit, using cached response", { lang: this.language, featureQID, linkedEntityQIDs, out });
        } else {
            console.debug("fetchEntityLinkNotes: Cache miss, fetching data", { lang: this.language, featureQID, linkedEntityQIDs });
            const sparqlQueryTemplate = await this.resolveQuery(),
                linkedEntityValues = Array.from(linkedEntityQIDs).map(linkedEntityQID => `wd:${linkedEntityQID}`).join(" "),
                sparqlQuery = sparqlQueryTemplate
                    .replaceAll('${featureQID}', featureQID)
                    .replaceAll('${linkedEntityValues}', linkedEntityValues)
                    .replaceAll('${propertyPID}', propertyPID)
                    .replaceAll('${language}', this.language);
            // console.log(sparqlQuery)
            const res = await this.api.postSparqlQuery("sparql", sparqlQuery, "json");

            if (!res?.data?.results?.bindings?.length) {
                console.debug("fetchEntityLinkNotes: no results");
                out = {};
            } else {
                out = res.data.results.bindings.reduce<Record<string, EntityLinkNote>>((acc, binding) => {
                    const linkedEntityQID = binding.linkedEntity?.value?.replace(WikidataService.WD_ENTITY_PREFIX, "");
                    if (!linkedEntityQID) {
                        console.warn("fetchEntityLinkNotes: no linked entity Q-ID", { binding });
                    } else {
                        acc[linkedEntityQID] = {
                            entityQID: binding.stmtEntity?.value?.replace(WikidataService.WD_ENTITY_PREFIX, ""),
                            languages: binding.languages?.value,
                        }
                    }
                    return acc;
                }, {});
            }
            try {
                console.debug("fetchEntityLinkNotes: Finished fetching, saving cache", { lang: this.language, featureQID, linkedEntityQIDs, out });
                void this.db?.addEntityLinkNotes(featureQID, propertyPID, linkedEntityQIDs, this.language, out);
            } catch (e) {
                console.warn("Failed to store details data in cache", { lang: this.language, featureQID, linkedEntityQIDs, out, e });
            }
        }
        return out;
    }
}
