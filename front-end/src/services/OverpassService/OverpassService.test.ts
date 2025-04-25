import directPreset from "../../../public/presets/etymology.json";
import { SourcePreset } from '../../model/SourcePreset';
import { BERLIN_BBOX, runServiceTests } from '../MapServiceTest';
import { OverpassService } from "./OverpassService";

const BASE_PRESET = { id: "base_test" },
    BAD_BASE_BACKEND_IDS = [
        "",
        "pmtiles_all",
        "pmtiles_osm_name_etymology",
        "overpass_osm_name_etymology",
        "overpass_osm_all",
        "overpass_ohm_all",
        "overpass_osm_wd+wd_direct",
        "wd_base",
        "wd_direct",
        "qlever_osm_wd",
        "qlever_wd_base",
        "qlever_osm_wd_base",
        "qlever_wd_direct",
        "qlever_osm_wd_direct",
        "qlever_wd_reverse",
        "qlever_wd_qualifier",
        "qlever_wd_indirect",
        "qlever_osm_wd_reverse",
    ],
    GOOD_BASE_BACKEND_IDS = [
        "overpass_osm_wd",
        "overpass_ohm_wd",
    ],
    BAD_DIRECT_BACKEND_IDS = [
        "",
        "pmtiles_all",
        "pmtiles_osm_name_etymology",
        "overpass_osm_wd+wd_direct",
        "wd_base",
        "wd_direct",
        "qlever_osm_wd",
        "qlever_wd_base",
        "qlever_osm_wd_base",
        "qlever_wd_direct",
        "qlever_osm_wd_direct",
        "qlever_wd_reverse",
        "qlever_wd_qualifier",
        "qlever_wd_indirect",
        "qlever_osm_wd_reverse",
    ],
    GOOD_DIRECT_BACKEND_IDS = [
        "overpass_osm_name_etymology",
        "overpass_ohm_name_etymology",
        "overpass_osm_all",
        "overpass_ohm_all",
        // "overpass_osm_wd", // Checked in base preset
        // "overpass_ohm_wd", // Checked in base preset
    ],
    baseService = new OverpassService(BASE_PRESET, 1000, 800),
    directService = new OverpassService(directPreset as SourcePreset, 1000, 800);

runServiceTests("base", baseService, BAD_BASE_BACKEND_IDS, GOOD_BASE_BACKEND_IDS, BERLIN_BBOX);
runServiceTests("direct", directService, BAD_DIRECT_BACKEND_IDS, GOOD_DIRECT_BACKEND_IDS, BERLIN_BBOX);
