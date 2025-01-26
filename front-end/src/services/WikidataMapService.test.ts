import { readFile } from "fs/promises";
import reversePreset from "../../public/presets/burial.json";
import directPreset from "../../public/presets/etymology.json";
import { SourcePreset } from '../model/SourcePreset';
import { BOLOGNA_BBOX, runServiceTests } from './MapServiceTest';
import { WikidataMapService } from "./WikidataMapService";

const BASE_PRESET = { id: "base_test" },
    BAD_BASE_BACKEND_IDS = [
        "",
        "pmtiles_all",
        "pmtiles_osm_name_etymology",
        "overpass_osm_name_etymology",
        "overpass_osm_all",
        "overpass_ohm_all",
        "overpass_osm_wd+wd_direct",
        "overpass_osm_wd",
        "overpass_ohm_wd",
        "wd_direct",
        "wd_reverse",
        "wd_qualifier",
        "wd_indirect",
        "qlever_osm_wd",
    ],
    GOOD_BASE_BACKEND_IDS = [
        "wd_base",
    ],
    BAD_DIRECT_BACKEND_IDS = [
        "",
        "pmtiles_all",
        "pmtiles_osm_name_etymology",
        "overpass_osm_wd+wd_direct",
        "qlever_osm_wd",
        "overpass_osm_name_etymology",
        "overpass_ohm_name_etymology",
        "overpass_osm_all",
        "overpass_ohm_all",
        "overpass_osm_wd",
        "overpass_ohm_wd",
        "wd_reverse",
        "wd_qualifier",
        "wd_indirect",
    ],
    GOOD_DIRECT_BACKEND_IDS = [
        "wd_direct",
        // "wd_base", // Checked in base preset
    ],
    BAD_REVERSE_BACKEND_IDS = [
        "",
        "pmtiles_all",
        "pmtiles_osm_name_etymology",
        "overpass_osm_name_etymology",
        "overpass_osm_all",
        "overpass_ohm_all",
        "overpass_osm_wd+wd_direct",
        "overpass_osm_wd",
        "overpass_ohm_wd",
        "wd_direct",
        "qlever_osm_wd",
    ],
    GOOD_REVERSE_BACKEND_IDS = [
        "wd_reverse",
        "wd_qualifier",
        "wd_indirect",
        // "wd_base", // Checked in base preset
    ],
    resolveQuery = (type: string) => readFile(`public/wdqs/${type}.sparql`).then(b => b.toString()),
    baseService = new WikidataMapService(BASE_PRESET, undefined, resolveQuery),
    directService = new WikidataMapService(directPreset as SourcePreset, undefined, resolveQuery),
    reverseService = new WikidataMapService(reversePreset as SourcePreset, undefined, resolveQuery);

runServiceTests("WikidataMapService base", baseService, BAD_BASE_BACKEND_IDS, GOOD_BASE_BACKEND_IDS, BOLOGNA_BBOX);
runServiceTests("WikidataMapService direct", directService, BAD_DIRECT_BACKEND_IDS, GOOD_DIRECT_BACKEND_IDS, BOLOGNA_BBOX);
runServiceTests("WikidataMapService reverse", reverseService, BAD_REVERSE_BACKEND_IDS, GOOD_REVERSE_BACKEND_IDS, BOLOGNA_BBOX);
