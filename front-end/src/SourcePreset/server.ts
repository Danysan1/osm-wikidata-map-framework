import { existsSync, readFileSync } from "fs";
import { join } from 'path';
import { CUSTOM_SOURCE_PRESET_ID, SourcePreset } from '../model/SourcePreset';
import { getCustomSourcePreset } from "./common";

export function readSourcePreset(sourcePresetID?: string): SourcePreset {
    let preset: SourcePreset;
    if (!sourcePresetID || sourcePresetID === CUSTOM_SOURCE_PRESET_ID) {
        preset = getCustomSourcePreset();
    } else {
        const presetPath = join(process.cwd(), "public", "presets", sourcePresetID + ".json");
        if (!existsSync(presetPath))
            throw new Error("Preset file not found: " + presetPath);

        const presetContent = readFileSync(presetPath, "utf8"),
            presetObj: unknown = JSON.parse(presetContent);
        if (!presetObj || typeof presetObj !== "object")
            throw new Error("Invalid preset object found in " + presetPath);
        preset = { id: sourcePresetID, ...presetObj };
    }
    console.debug("readSourcePreset", { sourcePresetID, preset });
    return preset;
}
