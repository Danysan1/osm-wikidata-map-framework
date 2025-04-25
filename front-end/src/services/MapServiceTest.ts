import { describe, expect, test } from '@jest/globals';
import type { BBox } from "geojson";
import { MapService } from "./MapService";

export const BERLIN_BBOX: BBox = [13.34766, 52.49135, 13.38856, 52.50501],
    BOLOGNA_BBOX: BBox = [11.30347, 44.48492, 11.35437, 44.50762],
    LUGANO_BBOX: BBox = [8.925356, 45.988981, 45.990240, 8.928537],
    LANGUAGE = "it_CH";

export function runServiceTests(
    name: string,
    service: MapService,
    badBackEndIDs: string[],
    goodBackEndIDs: string[],
    bbox: BBox
) {
    describe("canHandleBackEnd = true", () => {
        goodBackEndIDs.forEach(
            backEndID => test(`${name} "${backEndID}"`, () => {
                process.env.NEXT_PUBLIC_OWMF_enable_open_historical_map = "true";
                expect(service.canHandleBackEnd(backEndID)).toBeTruthy();
            })
        );
    });

    describe("canHandleBackEnd = false", () => {
        badBackEndIDs.forEach(
            backEndID => test(`${name} "${backEndID}"`, () => {
                process.env.NEXT_PUBLIC_OWMF_enable_open_historical_map = "true";
                expect(service.canHandleBackEnd(backEndID)).toBeFalsy();
            })
        );
    });

    describe("fetchMapElements", () => {
        goodBackEndIDs.forEach(backEndID => {
            test(`${name} "${backEndID}" centroids`, async () => {
                process.env.NEXT_PUBLIC_OWMF_enable_open_historical_map = "true";
                const geoJson = await service.fetchMapElements(
                    backEndID, true, bbox, LANGUAGE, new Date().getFullYear()
                );

                expect(geoJson).toHaveProperty("features");
                expect(geoJson.features.length).toBeGreaterThan(0);

                expect(geoJson).toHaveProperty("bbox");
                expect(geoJson.bbox?.[0]).toEqual(bbox[0]);
                expect(geoJson.bbox?.[1]).toEqual(bbox[1]);
            }, 20_000);
        });
    });
}