import { describe, expect, test } from '@jest/globals';
import { readFile } from "fs/promises";
import { WikidataEntityLinkNotesService } from "./WikidataEntityLinkNotesService";

const LANGUAGE = "en",
    BAD_QIDS: string[][] = [
        ["", "P138", "Q2"],
        ["Q1", "", "Q2"],
        ["Q1", "P138", ""],
        ["Q", "P138", "Q2"],
        ["Q1", "P", "Q2"],
        ["Q1", "P138", "Q"],
    ],
    GOOD_QIDS_NO_RESULT: string[][] = [
        ["Q1", "P138", "Q2"],
    ],
    GOOD_QIDS_WITH_ENTITY: string[][] = [
        ["Q38", "P138", "Q913582", "Q1121889"],
        ["Q183", "P138", "Q62646", "Q778726"],
        ["Q183", "P138", "Q132990", "Q778726"],
        ["Q184", "P138", "Q465341", "Q104529608"],
    ],
    GOOD_QIDS_WITH_LANGUAGES: string[][] = [
        ["Q183", "P138", "Q62646", "English"],
        ["Q183", "P138", "Q132990", "French"],
        ["Q183", "P138", "Q101985", "Estonian"],
        ["Q183", "P138", "Q38872", "Tahitian"],
    ],
    resolveQuery = () => readFile(`public/wdqs/entityLinkNotes.sparql`).then(b => b.toString()),
    service = new WikidataEntityLinkNotesService(LANGUAGE, undefined, resolveQuery);

describe("fetchEntityLinkNotes bad Q-IDs", () => {
    BAD_QIDS.forEach(
        QIDs => test(
            QIDs.reduce((acc, s) => acc + "," + (s || "_"), "") || "<empty>",
            async () => await expect(
                () => service.fetchEntityLinkNotes(QIDs[0], QIDs[1], QIDs[2])
            ).rejects.toThrow(Error)
        )
    );
});

describe("fetchEntityLinkNotes good Q-IDs with no result", () => {
    GOOD_QIDS_NO_RESULT.forEach(
        QIDs => test(QIDs.join(","), async () => {
            const ret = await service.fetchEntityLinkNotes(QIDs[0], QIDs[1], QIDs[2]);
            expect(ret?.entityQID).toBeUndefined();
            expect(ret?.languages).toBeUndefined();
        })
    );
});

describe("fetchEntityLinkNotes good Q-IDs with entity", () => {
    GOOD_QIDS_WITH_ENTITY.forEach(
        QIDs => test(QIDs.join(","), async () => {
            const ret = await service.fetchEntityLinkNotes(QIDs[0], QIDs[1], QIDs[2]);
            expect(ret?.entityQID).toBeTruthy();
            expect(ret?.entityQID).toBe(QIDs[3]);
        })
    );
});

describe("fetchEntityLinkNotes good Q-IDs with languages", () => {
    GOOD_QIDS_WITH_LANGUAGES.forEach(
        QIDs => test(QIDs.join(","), async () => {
            const ret = await service.fetchEntityLinkNotes(QIDs[0], QIDs[1], QIDs[2]);
            expect(ret?.languages).toBeTruthy();
            expect(ret?.languages?.includes(QIDs[3])).toBeTruthy();
        })
    );
});
