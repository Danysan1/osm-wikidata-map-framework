import { DEFAULT_SOURCE_PRESET_ID, SourcePreset } from '../model/SourcePreset';
import { getCustomSourcePreset } from "./common";

export async function fetchSourcePreset(sourcePresetID?: string) {
    let preset: SourcePreset;
    if (!sourcePresetID || sourcePresetID === DEFAULT_SOURCE_PRESET_ID) {
        preset = getCustomSourcePreset();
    } else {
        const presetURL = `${process.env.owmf_base_path ?? ""}/presets/${sourcePresetID}.json`,
            presetResponse = await fetch(presetURL);
        if (!presetResponse.ok)
            throw new Error(`Failed fetching preset "${presetURL}"`);

        const presetObj: unknown = await presetResponse.json();
        if (presetObj === null || typeof presetObj !== "object")
            throw new Error(`Invalid preset object found in "${presetURL}"`);

        preset = {
            ...presetObj,
            id: sourcePresetID,
        };
    }
    console.debug("fetchSourcePreset", { sourcePresetID, preset });
    return preset;
}
