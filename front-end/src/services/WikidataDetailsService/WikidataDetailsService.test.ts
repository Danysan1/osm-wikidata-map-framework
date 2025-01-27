import { describe, expect, test } from '@jest/globals';
import { readFile } from "fs/promises";
import { WikidataDetailsService } from "./WikidataDetailsService";

const LANGUAGE = "en",
    BAD_QIDS: string[][] = [
        [],
        ["Q1", ""],
        ["foo"],
        ["Q"],
    ],
    GOOD_QIDS: string[][] = [
        ["Q1"],
        ["Q1", "Q42"],
    ],
    resolveQuery = () => readFile(`public/wdqs/entity-details.sparql`).then(b => b.toString()),
    service = new WikidataDetailsService(LANGUAGE, undefined, resolveQuery);

describe("fetchEtymologyDetails bad Q-IDs", () => {
    BAD_QIDS.forEach(
        QIDs => test(
            QIDs.reduce((acc, s) => acc + "," + (s || "_"), "") || "<empty>",
            async () => await expect(
                () => service.fetchEtymologyDetails(QIDs)
            ).rejects.toThrow(Error)
        )
    );
});

describe("fetchEtymologyDetails good Q-IDs", () => {
    GOOD_QIDS.forEach(
        QIDs => test(QIDs.join(","), async () => {
            const ret = await service.fetchEtymologyDetails(QIDs);
            expect(Object.keys(ret)).toHaveLength(QIDs.length);

            expect(ret).toHaveProperty("Q1");
            expect(ret.Q1).toHaveProperty("wikidata", "Q1");
            expect(ret.Q1).toHaveProperty("name", "Universe");
        })
    );
});