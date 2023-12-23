import { BackgroundStyle } from '../model/backgroundStyle';
import { DropdownControl } from './DropdownControl';

/**
 * Let the user choose the map style.
 **/
export class BackgroundStyleControl extends DropdownControl {
    constructor(backgroundStyles: BackgroundStyle[], startBackgroundStyleId?: string) {
        super(
            '🌍',
            backgroundStyles.map(style => ({
                id: style.id,
                category: style.vendorText,
                text: style.styleText,
                onSelect: () => this.setBackgroundStyle(style)
            })),
            startBackgroundStyleId ? startBackgroundStyleId : backgroundStyles[0]?.id,
            'choose_basemap'
        );
    }

    async setBackgroundStyle(style: BackgroundStyle) {
        if (style.keyPlaceholder && style.key) {
            const resp = await fetch(style.styleUrl),
                rawJSON = await resp.text(),
                json = rawJSON.replaceAll(style.keyPlaceholder, style.key);
            this.getMap()?.setStyle(JSON.parse(json))
        } else {
            this.getMap()?.setStyle(style.styleUrl);
        }
        this.showDropdown(false);
    }
}
