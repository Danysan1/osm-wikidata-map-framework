import directPreset from "../../../public/presets/etymology.json";
import { SourcePreset } from '../../model/SourcePreset';
import { BOLOGNA_BBOX, runServiceTests } from '../MapServiceTest';
import { PostpassService } from "./PostpassService";

const BASE_PRESET = { id: "base_test" },
    BAD_BASE_BACKEND_IDS = [
        "",
        "foo",
        "overpass_osm_wd",
        "overpass_ohm_wd",
        "overpass_osm_rel_role",
        "pmtiles_all",
        "pmtiles_osm_name_etymology",
        "postpass_osm_name_etymology",
        "postpass_osm_all",
        "postpass_ohm_all",
        "postpass_osm_wd+wd_direct",
        "postpass_osm_rel_role",
        "postpass_ohm_wd",
        "qlever_osm_wd",
        "qlever_wd_base",
        "qlever_osm_wd_base",
        "qlever_wd_direct",
        "qlever_osm_wd_direct",
        "qlever_wd_reverse",
        "qlever_wd_qualifier",
        "qlever_wd_indirect",
        "qlever_osm_wd_reverse",
        "wd_base",
        "wd_direct",
        "wd_reverse",
    ],
    GOOD_BASE_BACKEND_IDS = [
        "postpass_osm_wd",
    ],
    BAD_DIRECT_BACKEND_IDS = [
        "",
        "foo",
        "overpass_osm_name_etymology",
        "overpass_ohm_name_etymology",
        "overpass_osm_all",
        "overpass_ohm_all",
        "overpass_osm_rel_role",
        "pmtiles_all",
        "pmtiles_osm_name_etymology",
        "postpass_osm_wd+wd_direct",
        "postpass_osm_rel_role",
        "postpass_ohm_name_etymology",
        "postpass_ohm_all",
        "qlever_osm_wd",
        "qlever_wd_base",
        "qlever_osm_wd_base",
        "qlever_wd_direct",
        "qlever_osm_wd_direct",
        "qlever_wd_reverse",
        "qlever_wd_qualifier",
        "qlever_wd_indirect",
        "qlever_osm_wd_reverse",
        "wd_base",
        "wd_direct",
        "wd_reverse",
    ],
    GOOD_DIRECT_BACKEND_IDS = [
        "postpass_osm_name_etymology",
        "postpass_osm_all",
        "postpass_osm_wd", // Different meaning than base preset
    ],
    baseService = new PostpassService(BASE_PRESET, 1000, 800),
    directService = new PostpassService(directPreset as SourcePreset, 1000, 800);

runServiceTests("base", baseService, BAD_BASE_BACKEND_IDS, GOOD_BASE_BACKEND_IDS, BOLOGNA_BBOX);
runServiceTests("direct", directService, BAD_DIRECT_BACKEND_IDS, GOOD_DIRECT_BACKEND_IDS, BOLOGNA_BBOX);
