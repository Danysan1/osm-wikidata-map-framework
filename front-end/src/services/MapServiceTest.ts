import { describe, expect, test } from '@jest/globals';
import type { BBox } from "geojson";
import { MapService } from "./MapService";

export const BERLIN_BBOX: BBox = [13.34766, 52.49135, 13.38856, 52.50501],
    BOLOGNA_BBOX: BBox = [11.30347, 44.48492, 11.35437, 44.50762],
    LUGANO_BBOX: BBox = [8.925356, 45.988981, 45.990240, 8.928537];

export function runServiceTests(name: string, service: MapService, badIDs: string[], goodIDs: string[], bbox: BBox) {
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
                    backEndID, true, bbox, "it", new Date().getFullYear()
                );
                
                expect(geoJson).toHaveProperty("features");
                expect(geoJson.features.length).toBeGreaterThan(0);

                expect(geoJson).toHaveProperty("bbox");
                expect(geoJson.bbox?.[0]).toEqual(bbox[0]);
                expect(geoJson.bbox?.[1]).toEqual(bbox[1]);
            }, 10_000);
        });
    });
}