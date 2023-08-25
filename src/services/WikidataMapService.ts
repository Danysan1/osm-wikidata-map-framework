import { WikidataService } from "./WikidataService";
import indirectMapQuery from "./query/map/indirect.sparql";
import reverseMapQuery from "./query/map/reverse.sparql";
import qualifierMapQuery from "./query/map/qualifier.sparql";
import directMapQuery from "./query/map/direct.sparql";
import baseMapQuery from "./query/map/base.sparql";
import { debug, getConfig, getJsonConfig } from "../config";
import { parse as parseWKT } from "wellknown";
import { Feature as GeoJsonFeature, GeoJSON, GeoJsonProperties, Point, BBox } from "geojson";
import { Etymology, EtymologyFeature, EtymologyResponse } from "../generated/owmf";
import { logErrorMessage } from "../monitoring";
import { MapDatabase } from "../db/MapDatabase";

export type Feature = GeoJsonFeature<Point, GeoJsonProperties> & EtymologyFeature;

export class WikidataMapService extends WikidataService {
    protected db: MapDatabase;

    constructor(db: MapDatabase) {
        super();
        this.db = db;
    }

    canHandleSource(sourceID: string): boolean {
        if (!/^wd_(base|direct|indirect|reverse|qualifier)(_P\d+)?$/.test(sourceID))
            return false;

        return true;
    }

    async fetchMapData(sourceID: string, bbox: BBox): Promise<GeoJSON & EtymologyResponse> {
        let out = await this.db.getMap(sourceID, bbox, this.language);
        if (out) {
            if (debug) console.info("Wikidata map cache hit, using cached response", { sourceID, bbox, language: this.language, out });
        } else {
            if (debug) console.info("Wikidata map cache miss, fetching data", { sourceID, bbox, language: this.language });
            let sparqlQueryTemplate: string;
            if (sourceID === "wd_base")
                sparqlQueryTemplate = baseMapQuery;
            else if (sourceID.startsWith("wd_direct"))
                sparqlQueryTemplate = this.getDirectSparqlQuery(sourceID);
            else
                sparqlQueryTemplate = this.getIndirectSparqlQuery(sourceID);
            const maxElements = getConfig("max_map_elements"),
                sparqlQuery = sparqlQueryTemplate
                    .replaceAll('${language}', this.language || '')
                    .replaceAll('${defaultLanguage}', this.defaultLanguage)
                    .replaceAll('${limit}', maxElements ? "LIMIT " + maxElements : "")
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
            out.language = this.language;
            this.db.addMap(out);
        }
        if (debug) console.info(`Wikidata fetchMapData found ${out.features.length} features`, out);
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
        return sparqlQueryTemplate
            .replaceAll('${indirectProperty}', indirectProperty)
            .replaceAll('${pictureQuery}', pictureQuery);
    }

    private featureReducer(acc: Feature[], row: any): Feature[] {
        if (!row.location?.value) {
            logErrorMessage("Invalid response from Wikidata (no location)", "warning", row);
            return acc;
        }

        const wkt_geometry = row.location.value as string,
            geometry = parseWKT(wkt_geometry) as Point | null;
        if (!geometry) {
            if (debug) console.info("Failed to parse WKT coordinates", { wkt_geometry, row });
            return acc;
        }

        const feature_wd_id = row.item?.value?.replace(WikidataService.WD_ENTITY_PREFIX, ""),
            etymology_wd_id = row.etymology?.value?.replace(WikidataService.WD_ENTITY_PREFIX, ""),
            existingFeature = acc.find(
                feature => (feature.id !== undefined && feature.id === feature_wd_id) || (feature.geometry.coordinates[0] === geometry.coordinates[0] && feature.geometry.coordinates[1] === geometry.coordinates[1])
            );
        if (existingFeature?.properties?.etymologies?.some(etymology => etymology.wikidata === etymology_wd_id)) {
            if (debug) console.info("Duplicate etymology", { existing: existingFeature.properties, new: row });
        }

        const etymology: Etymology | null = etymology_wd_id ? {
            from_osm: false,
            from_wikidata: true,
            from_wikidata_entity: row.from_entity?.value?.replace(WikidataService.WD_ENTITY_PREFIX, ""),
            from_wikidata_prop: row.from_prop?.value?.replace(WikidataService.WD_PROPERTY_PREFIX, ""),
            propagated: false,
            wikidata: etymology_wd_id,
        } : null;

        if (!existingFeature) { // Add the new feature for this item 
            const osm = row.osm?.value,
                osm_type = osm?.split("/").at(3),
                osm_id = osm ? parseInt(osm.split("/").at(4)) : undefined;

            acc.push({
                type: "Feature",
                id: feature_wd_id,
                geometry,
                properties: {
                    commons: row.commons?.value,
                    etymologies: etymology ? [etymology] : undefined,
                    from_osm: false,
                    from_wikidata: true,
                    name: row.itemLabel?.value,
                    description: row.itemDescription?.value,
                    osm_id,
                    osm_type,
                    picture: row.picture?.value,
                    wikidata: feature_wd_id,
                    wikipedia: row.wikipedia?.value,
                }
            });
        } else if (etymology) { // Add the new etymology to the existing feature for this feature
            existingFeature.properties?.etymologies?.push(etymology);
        }

        return acc;
    }
}