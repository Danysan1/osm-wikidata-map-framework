import { OverpassService } from "./OverpassService";
import directPreset from "../../public/presets/etymology.json";
import { SourcePreset } from '../model/SourcePreset';
import { runServiceTests } from './MapServiceTest';

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
        "qlever_osm_wd"
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
        "qlever_osm_wd"
    ],
    GOOD_DIRECT_BACKEND_IDS = [
        "overpass_osm_name_etymology",
        "overpass_ohm_name_etymology",
        "overpass_osm_all",
        "overpass_ohm_all",
        // "overpass_osm_wd", // Checked in base preset
        // "overpass_ohm_wd", // Checked in base preset
    ],
    baseService = new OverpassService(BASE_PRESET, 8000, 800),
    directService = new OverpassService(directPreset as SourcePreset, 8000, 800);

runServiceTests("OverpassService base", baseService, BAD_BASE_BACKEND_IDS, GOOD_BASE_BACKEND_IDS);
runServiceTests("OverpassService direct", directService, BAD_DIRECT_BACKEND_IDS, GOOD_DIRECT_BACKEND_IDS);
