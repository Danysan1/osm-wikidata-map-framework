import { getStringArrayConfig } from '../config';
import { DropdownControl } from './DropdownControl';
import { getCorrectFragmentParams, setFragmentParams } from '../fragment';
import type { TFunction } from "i18next";
import { DEFAULT_SOURCE_PRESET_ID } from '../model/SourcePreset';

/**
 * Let the user choose the tags template.
 * 
 * @see https://docs.mapbox.com/mapbox-gl-js/example/toggle-layers/
 **/
export class SourcePresetControl extends DropdownControl {
    constructor(
        startSourcePresetID: string, onTemplateChange: (templateID: string) => void, t: TFunction
    ) {
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        const sourcePresetIDs = getStringArrayConfig("source_presets") || [DEFAULT_SOURCE_PRESET_ID],
            selectBackEnd = (sourcePresetID: string) => {
                if (process.env.NODE_ENV === 'development') console.debug("Selecting source preset ", { sourcePresetID });

                // If the change came from a manual interaction, update the fragment params
                setFragmentParams(undefined, undefined, undefined, undefined, undefined, undefined, sourcePresetID);

                // If the change came from a fragment change, update the dropdown
                // Regardless of the source, update the map
                onTemplateChange(sourcePresetID);
            };
        if (process.env.NODE_ENV === 'development') console.debug("SourcePresetControl: initialized with source presets", { sourcePresetIDs, startSourcePresetID });

        const dropdownItems = sourcePresetIDs.map(
            sourcePresetID => ({
                id: sourcePresetID,
                text: t("preset." + sourcePresetID),
                onSelect: () => {
                    selectBackEnd(sourcePresetID);
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
            () => this.value = getCorrectFragmentParams().sourcePresetID
        );
    }
}
