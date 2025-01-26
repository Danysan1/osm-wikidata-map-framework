import { describe, expect, test } from '@jest/globals';
import { BERLIN_BBOX } from "./MapService";
import { MapService } from "./MapService";


export function runServiceTests(name: string, service: MapService, badIDs: string[], goodIDs: string[]) {
    describe("canHandleBackEnd = true", () => {
        goodIDs.forEach(
            backEndID => test(`${name} "${backEndID}"`, () => {
                expect(service.canHandleBackEnd(backEndID)).toBeTruthy();
            })
        );
    });
    describe("canHandleBackEnd = false", () => {
        badIDs.forEach(
            backEndID => test(`${name} "${backEndID}"`, () => {
                expect(service.canHandleBackEnd(backEndID)).toBeFalsy();
            })
        );
    });

    describe("fetchMapElements", () => {
        goodIDs.forEach(backEndID => {
            test(`${name} "${backEndID}" centroids`, async () => {
                const geoJson = await service.fetchMapElements(
                    backEndID, true, BERLIN_BBOX, "it", new Date().getFullYear()
                );
                expect(geoJson).toHaveProperty("features");
                expect(geoJson.features.length).toBeGreaterThan(0);
                expect(geoJson).toHaveProperty("bbox");
                expect(geoJson.bbox?.[0]).toEqual(BERLIN_BBOX[0]);
                expect(geoJson.bbox?.[1]).toEqual(BERLIN_BBOX[1]);
            });
        });
    });
}