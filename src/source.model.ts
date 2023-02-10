export type SourceID = "overpass" | "etymology" | "subject" | "buried" | "wikidata" | "propagated" | "all";

export const sources: Record<SourceID, string> = {
    overpass: "OSM (real time via Overpass API)",
    etymology: "OSM name:etymology:wikidata (from DB)",
    subject: "OSM subject:wikidata (from DB)",
    buried: "OSM buried:wikidata (from DB)",
    wikidata: "OSM + Wikidata P138/P547/P825 (from DB)",
    propagated: "Propagated (from DB)",
    all: "All sources from DB",
};
