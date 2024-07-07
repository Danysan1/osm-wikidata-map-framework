import { DEFAULT_SOURCE_PRESET_ID, SourcePreset } from '../model/SourcePreset';
import { getCustomSourcePreset } from "./common";

export async function fetchSourcePreset(sourcePresetID?: string) {
    let preset: SourcePreset;
    if (!sourcePresetID || sourcePresetID === DEFAULT_SOURCE_PRESET_ID) {
        preset = getCustomSourcePreset();
    } else {
        const presetResponse = await fetch(`presets/${sourcePresetID}.json`);
        if (!presetResponse.ok)
            throw new Error(`Failed fetching preset "${sourcePresetID}.json"`);

        const presetObj: unknown = await presetResponse.json();
        if (presetObj === null || typeof presetObj !== "object")
            throw new Error(`Invalid preset object found in "${sourcePresetID}.json"`);

        preset = { id: sourcePresetID, ...presetObj };
    }
    if (process.env.NODE_ENV === 'development') console.debug(
        "fetchSourcePreset", { sourcePresetID, preset }
    );
    return preset;
}
