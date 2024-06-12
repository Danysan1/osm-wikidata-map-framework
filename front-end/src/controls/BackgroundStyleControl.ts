import type { StyleSpecification } from 'maplibre-gl';
import { getBackgroundStyleID } from '../hooks/useUrlFragment';
import type { BackgroundStyle } from '../model/backgroundStyle';
import { DropdownControl } from './DropdownControl';

/**
 * Let the user choose the map style.
 **/
export class BackgroundStyleControl extends DropdownControl {
    private readonly setBackgroundStyleID: (styleID: string) => void;

    constructor(backgroundStyles: BackgroundStyle[], initialStyleID: string, setBackgroundStyleID: (styleID:string) => void) {
        super(
            '🌍',
            backgroundStyles.map(style => ({
                id: style.id,
                category: style.vendorText,
                text: style.styleText,
                onSelect: () => this.setBackgroundStyle(style)
            })),
            initialStyleID,
            'choose_basemap'
        );

        this.setBackgroundStyleID = setBackgroundStyleID;
        window.addEventListener('hashchange', () => {
            const backgroundStyleID = getBackgroundStyleID();
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
        this.setBackgroundStyleID(style.id);
        this.showDropdown(false);
    }
}
