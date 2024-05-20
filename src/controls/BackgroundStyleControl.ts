import type { StyleSpecification } from 'maplibre-gl';
import type { BackgroundStyle } from '../model/backgroundStyle';
import { DropdownControl } from './DropdownControl';
import { UrlFragment } from '../UrlFragment';

const fragment = new UrlFragment();

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
            fragment.backgroundStyle,
            'choose_basemap'
        );

        window.addEventListener('hashchange', () => {
            const backgroundStyleID = fragment.backgroundStyle;
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
        fragment.backgroundStyle = style.id;
        this.showDropdown(false);
    }
}
