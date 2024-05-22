import { getStringArrayConfig } from '../config';
import { DropdownControl } from './DropdownControl';
import { UrlFragment } from '../UrlFragment';
import type { TFunction } from "i18next";
import { DEFAULT_SOURCE_PRESET_ID } from '../model/SourcePreset';

const fragment = new UrlFragment();

/**
 * Let the user choose the tags template.
 * 
 * @see https://docs.mapbox.com/mapbox-gl-js/example/toggle-layers/
 **/
export class SourcePresetControl extends DropdownControl {
    constructor(
        startSourcePresetID: string, onPresetChange: (templateID: string) => void, t: TFunction
    ) {
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        const sourcePresetIDs = getStringArrayConfig("source_presets") || [DEFAULT_SOURCE_PRESET_ID],
            selectPreset = (sourcePresetID: string) => {
                if (process.env.NODE_ENV === 'development') console.debug("Selecting source preset ", { sourcePresetID });

                // If the change came from a manual interaction, update the fragment params
                fragment.sourcePreset = sourcePresetID;

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
            () => this.value = fragment.sourcePreset
        );
    }
}
