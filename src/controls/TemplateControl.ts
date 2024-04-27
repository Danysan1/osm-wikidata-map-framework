import { getStringArrayConfig } from '../config';
import { DropdownControl } from './DropdownControl';
import { getCorrectFragmentParams, setFragmentParams } from '../fragment';
import type { TFunction } from "i18next";
import { DEFAULT_TEMPLATE } from '../model/Template';

/**
 * Let the user choose the tags template.
 * 
 * @see https://docs.mapbox.com/mapbox-gl-js/example/toggle-layers/
 **/
export class TemplateControl extends DropdownControl {
    constructor(
        startTemplateID: string, onTemplateChange: (templateID: string) => void, t: TFunction
    ) {
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        const templateIDs = getStringArrayConfig("templates") || [DEFAULT_TEMPLATE],
            selectBackEnd = (templateID: string) => {
                if (process.env.NODE_ENV === 'development') console.debug("Selecting template ", { templateID });

                // If the change came from a manual interaction, update the fragment params
                setFragmentParams(undefined, undefined, undefined, undefined, undefined, undefined, templateID);

                // If the change came from a fragment change, update the dropdown
                // Regardless of the source, update the map
                onTemplateChange(templateID);
            };
        console.debug("TemplateControl: initialized with templates", { templateIDs, startTemplateID });

        const dropdownItems = templateIDs.map(
            templateID => ({
                id: templateID,
                text: t(templateID),
                onSelect: () => {
                    selectBackEnd(templateID);
                    this.value = templateID;

                    // Hide the dropdown to leave more space for the map
                    this.showDropdown(false);
                }
            })
        );

        super(
            '⚙️',
            dropdownItems,
            startTemplateID,
            "source.choose_template",
            true,
            undefined,
            () => this.value = getCorrectFragmentParams().templateID
        );
    }
}
