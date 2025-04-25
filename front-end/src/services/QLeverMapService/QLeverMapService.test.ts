import { readFile } from "fs/promises";
import reversePreset from "../../../public/presets/burial.json";
import directPreset from "../../../public/presets/etymology.json";
import { SourcePreset } from '../../model/SourcePreset';
import { BOLOGNA_BBOX, runServiceTests } from '../MapServiceTest';
import { QLeverMapService } from "./QLeverMapService";

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
        "wd_base",
        "wd_direct",
        "wd_reverse",
        "wd_qualifier",
        "wd_indirect",
        "qlever_wd_direct",
        "qlever_osm_wd_direct",
        "qlever_ohm_wd_direct",
        "qlever_wd_reverse",
        "qlever_wd_qualifier",
        "qlever_wd_indirect",
        "qlever_osm_wd_reverse",
        "qlever_ohm_wd_reverse",
    ],
    GOOD_BASE_BACKEND_IDS = [
        "qlever_osm_wd",
        // "qlever_ohm_wd", // Currently zero results
        "qlever_wd_base",
        "qlever_osm_wd_base",
        // "qlever_ohm_wd_base", // Currently zero results
    ],
    BAD_DIRECT_BACKEND_IDS = [
        "",
        "pmtiles_all",
        "pmtiles_osm_name_etymology",
        "overpass_osm_wd+wd_direct",
        "overpass_osm_name_etymology",
        "overpass_ohm_name_etymology",
        "overpass_osm_all",
        "overpass_ohm_all",
        "overpass_osm_wd",
        "overpass_ohm_wd",
        "wd_base",
        "wd_direct",
        "wd_reverse",
        "wd_qualifier",
        "wd_indirect",
        "qlever_wd_reverse",
        "qlever_wd_qualifier",
        "qlever_wd_indirect",
        "qlever_osm_wd_reverse",
        "qlever_ohm_wd_reverse",
    ],
    GOOD_DIRECT_BACKEND_IDS = [
        "qlever_wd_direct",
        // "qlever_wd_base", // Checked in base preset
        "qlever_osm_wd_direct",
        // "qlever_ohm_wd_direct", // Currently zero results
        // "qlever_osm_wd_base", // Checked in base preset
        // "qlever_osm_wd", // Checked in base preset
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
        "wd_base",
        "wd_direct",
        "wd_reverse",
        "wd_qualifier",
        "wd_indirect",
        "qlever_wd_direct",
        "qlever_osm_wd_direct",
        "qlever_ohm_wd_direct",
    ],
    GOOD_REVERSE_BACKEND_IDS = [
        "qlever_wd_reverse",
        "qlever_wd_qualifier",
        "qlever_wd_indirect",
        // "qlever_wd_base", // Checked in base preset
        "qlever_osm_wd_reverse",
        // "qlever_ohm_wd_reverse", // Currently zero results
        // "qlever_osm_wd_base", // Checked in base preset
        // "qlever_osm_wd", // Checked in base preset
    ],
    resolveQuery = (type: string) => readFile(`public/qlever/${type}.sparql`).then(b => b.toString()),
    baseService = new QLeverMapService(BASE_PRESET, 8000, 800, undefined, undefined, resolveQuery),
    directService = new QLeverMapService(directPreset as SourcePreset, 8000, 800, undefined, undefined, resolveQuery),
    reverseService = new QLeverMapService(reversePreset as SourcePreset, 8000, 800, undefined, undefined, resolveQuery);

runServiceTests("base", baseService, BAD_BASE_BACKEND_IDS, GOOD_BASE_BACKEND_IDS, BOLOGNA_BBOX);
runServiceTests("direct", directService, BAD_DIRECT_BACKEND_IDS, GOOD_DIRECT_BACKEND_IDS, BOLOGNA_BBOX);
runServiceTests("reverse", reverseService, BAD_REVERSE_BACKEND_IDS, GOOD_REVERSE_BACKEND_IDS, BOLOGNA_BBOX);
