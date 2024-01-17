import type { StyleSpecification } from 'maplibre-gl';
import type { BackgroundStyle } from '../model/backgroundStyle';
import { DropdownControl } from './DropdownControl';
import { getCorrectFragmentParams, getFragmentParams, setFragmentParams } from '../fragment';

/**
 * Let the user choose the map style.
 **/
export class BackgroundStyleControl extends DropdownControl {
    constructor(backgroundStyles: BackgroundStyle[]) {
        super(
            '🌍',
            backgroundStyles.map(style => ({
                id: style.id,
                category: style.vendorText,
                text: style.styleText,
                onSelect: () => this.setBackgroundStyle(style)
            })),
            getCorrectFragmentParams().backgroundStyleID,
            'choose_basemap'
        );

        window.addEventListener('hashchange', () => {
            const backgroundStyleID = getFragmentParams().backgroundStyleID;
            if (backgroundStyleID)
                this.value = backgroundStyleID;
        });
    }

    async setBackgroundStyle(style: BackgroundStyle) {
        if (style.keyPlaceholder && style.key) {
            const resp = await fetch(style.styleUrl),
                rawJSON = await resp.text(),
                json = rawJSON.replaceAll(style.keyPlaceholder, style.key);
            if (process.env.NODE_ENV === 'development') console.debug("setBackgroundStyle: setting json style", { style, json });
            this.getMap()?.setStyle(JSON.parse(json) as StyleSpecification);
        } else {
            if (process.env.NODE_ENV === 'development') console.debug("setBackgroundStyle: setting style URL", style);
            this.getMap()?.setStyle(style.styleUrl);
        }
        setFragmentParams(undefined, undefined, undefined, undefined, undefined, style.id);
        this.showDropdown(false);
    }
}
