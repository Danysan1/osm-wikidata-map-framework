import { WikidataService } from "./WikidataService";
import indirectMapQuery from "./query/map/indirect.sparql";
import reverseMapQuery from "./query/map/reverse.sparql";
import qualifierMapQuery from "./query/map/qualifier.sparql";
import directMapQuery from "./query/map/direct.sparql";
import { debugLog, getConfig, getJsonConfig } from "../config";
import { parse as parseWKT } from "wellknown";
import { Feature as GeoJsonFeature, GeoJSON, GeoJsonProperties, Point, BBox } from "geojson";
import { Etymology, EtymologyFeature, EtymologyResponse } from "../generated/owmf";
import { logErrorMessage } from "../monitoring";
import { compress, decompress } from "lz-string";

export type Feature = GeoJsonFeature<Point, GeoJsonProperties> & EtymologyFeature;

export class WikidataMapService extends WikidataService {
    canHandleSource(sourceID: string): boolean {
        if (!/^wd_(direct|indirect|reverse|qualifier)(_P\d+)?$/.test(sourceID))
            return false;

        return true;
    }

    async fetchMapData(sourceID: string, bbox: BBox): Promise<GeoJSON & EtymologyResponse> {
        const cacheKey = `owmf.map.${sourceID}_${this.language}_${bbox.join("_")}`,
            cachedResponse = localStorage.getItem(cacheKey);
        let out: GeoJSON & EtymologyResponse;
        if (cachedResponse) {
            out = JSON.parse(decompress(cachedResponse));
            debugLog("Cache hit, using cached response", { cacheKey, out });
        } else {
            debugLog("Cache miss, fetching data", { cacheKey });
            const sparqlQueryTemplate = sourceID.startsWith("wd_direct") ? this.getDirectSparqlQuery(sourceID) : this.getIndirectSparqlQuery(sourceID),
                sparqlQuery = sparqlQueryTemplate
                    .replaceAll('${language}', this.language || '')
                    .replaceAll('${defaultLanguage}', this.defaultLanguage)
                    .replaceAll('${southWestWKT}', `Point(${bbox[0]} ${bbox[1]})`)
                    .replaceAll('${northEastWKT}', `Point(${bbox[2]} ${bbox[3]})`),
                ret = await this.api.postSparqlQuery({ format: "json", query: sparqlQuery });

            if (!ret.results?.bindings)
                throw new Error("Invalid response from Wikidata (no bindings)");

            out = {
                type: "FeatureCollection",
                bbox,
                features: ret.results.bindings.reduce(this.featureReducer, [])
            };
            out.wikidata_query = sparqlQuery;
            out.timestamp = new Date().toISOString();
            out.sourceID = sourceID;
            try {
                localStorage.setItem(cacheKey, compress(JSON.stringify(out)));
            } catch (e) {
                if (e instanceof DOMException && e.name === "QuotaExceededError") {
                    logErrorMessage("localStorage quota exceeded, clearing it", "warning", { cacheKey, out, e });
                    localStorage.clear();
                    localStorage.setItem(cacheKey, compress(JSON.stringify(out)));
                } else {
                    logErrorMessage("Failed to store map data in cache", "error", { cacheKey, out, e });
                }
            }
        }
        return out;
    }

    private getDirectSparqlQuery(sourceID: string): string {
        let properties: string[];
        const sourceProperty = /^wd_\w+_(P\d+)$/.exec(sourceID)?.at(1),
            directProperties = getJsonConfig("osm_wikidata_properties"),
            sparqlQueryTemplate = directMapQuery as string;
        if (!Array.isArray(directProperties) || !directProperties.length)
            throw new Error("Empty direct properties");

        if (!sourceProperty)
            properties = directProperties;
        else if (!directProperties.includes(sourceProperty))
            throw new Error("Invalid sourceProperty: " + sourceProperty);
        else
            properties = [sourceProperty];

        return sparqlQueryTemplate.replaceAll('${directProperties}', properties.map(id => "wdt:" + id).join(" "));
    }

    private getIndirectSparqlQuery(sourceID: string): string {
        const indirectProperty = getConfig("wikidata_indirect_property");
        if (!indirectProperty)
            throw new Error("No indirect property defined");

        let sparqlQueryTemplate: string;
        if (sourceID.startsWith("wd_indirect"))
            sparqlQueryTemplate = indirectMapQuery;
        else if (sourceID.startsWith("wd_reverse"))
            sparqlQueryTemplate = reverseMapQuery;
        else if (sourceID.startsWith("wd_qualifier"))
            sparqlQueryTemplate = qualifierMapQuery;
        else
            throw new Error("Invalid sourceID: " + sourceID);

        const imageProperty = getConfig("wikidata_image_property"),
            pictureQuery = imageProperty ? `OPTIONAL { ?etymology wdt:${imageProperty} ?picture. }` : '';
        return sparqlQueryTemplate.replaceAll('${indirectProperty}', indirectProperty).replaceAll('${pictureQuery}', pictureQuery);
    }

    private featureReducer(acc: Feature[], row: any): Feature[] {
        if (!row.location?.value) {
            logErrorMessage("Invalid response from Wikidata (no location)", "warning", row);
            return acc;
        }

        const wkt_geometry = row.location.value as string,
            geometry = parseWKT(wkt_geometry) as Point | null;
        if (!geometry) {
            debugLog("Failed to parse WKT coordinates", { wkt_geometry, row });
            return acc;
        }

        const feature_wd_id = row.item?.value?.replace(WikidataService.WD_ENTITY_PREFIX, ""),
            etymology_wd_id = row.etymology?.value?.replace(WikidataService.WD_ENTITY_PREFIX, ""),
            existingFeature = acc.find(
                feature => (feature.id !== undefined && feature.id === feature_wd_id) || (feature.geometry.coordinates[0] === geometry.coordinates[0] && feature.geometry.coordinates[1] === geometry.coordinates[1])
            );
        if (existingFeature?.properties?.etymologies?.some(etymology => etymology.wikidata === etymology_wd_id)) {
            debugLog("Duplicate etymology", { existing: existingFeature.properties, new: row });
        }

        const etymology: Etymology = {
            from_osm: false,
            from_wikidata: true,
            from_wikidata_entity: row.from_entity?.value?.replace(WikidataService.WD_ENTITY_PREFIX, ""),
            from_wikidata_prop: row.from_prop?.value?.replace(WikidataService.WD_PROPERTY_PREFIX, ""),
            propagated: false,
            wikidata: etymology_wd_id,
        };
        if (existingFeature) { // Add the new etymology to the existing item for this feature
            existingFeature.properties?.etymologies?.push(etymology);
        } else { // Add the new item for this feature 
            const osm = row.osm?.value,
                osm_type = osm?.split("/").at(3),
                osm_id = osm ? parseInt(osm.split("/").at(4)) : undefined;

            acc.push({
                type: "Feature",
                id: feature_wd_id,
                geometry,
                properties: {
                    commons: row.commons?.value,
                    etymologies: [etymology],
                    from_osm: false,
                    from_wikidata: true,
                    name: row.itemLabel?.value,
                    osm_id,
                    osm_type,
                    picture: row.picture?.value,
                    wikidata: feature_wd_id,
                    wikipedia: row.wikipedia?.value,
                }
            });
        }

        return acc;
    }
}