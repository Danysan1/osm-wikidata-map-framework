import type { TFunction } from "i18next";
import { parseStringArrayConfig } from "../config";
import { getSourcePresetID } from '../hooks/useUrlFragment';
import { DEFAULT_SOURCE_PRESET_ID } from '../model/SourcePreset';
import { DropdownControl } from './DropdownControl';

/**
 * Let the user choose the tags template.
 * 
 * @see https://docs.mapbox.com/mapbox-gl-js/example/toggle-layers/
 **/
export class SourcePresetControl extends DropdownControl {
    constructor(
        startSourcePresetID: string, onPresetChange: (sourcePresetID: string) => void, t: TFunction
    ) {
        const sourcePresetIDs = process.env.owmf_source_presets ? parseStringArrayConfig(process.env.owmf_source_presets) : [DEFAULT_SOURCE_PRESET_ID],
            selectPreset = (sourcePresetID: string) => {
                if (process.env.NODE_ENV === 'development') console.debug("Selecting source preset ", { sourcePresetID });

                // If the change came from a fragment change, update the dropdown
                // Regardless of the source, update the map
                onPresetChange(sourcePresetID);
            };
        if (process.env.NODE_ENV === 'development') console.debug("SourcePresetControl: initialized with source presets", { sourcePresetIDs, startSourcePresetID });

        const dropdownItems = sourcePresetIDs.map(
            sourcePresetID => ({
                id: sourcePresetID,
                text: t("preset." + sourcePresetID),
                onSelect: () => {
                    selectPreset(sourcePresetID);
                    this.value = sourcePresetID;

                    // Hide the dropdown to leave more space for the map
                    this.showDropdown(false);
                }
            })
        );

        super(
            '🗃️',
            dropdownItems,
            startSourcePresetID,
            "preset.choose_preset",
            true,
            undefined,
            () => this.value = getSourcePresetID() ?? startSourcePresetID
        );
    }
}
