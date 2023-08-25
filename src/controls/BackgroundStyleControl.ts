import { DropdownControl } from './DropdownControl';

export interface BackgroundStyle {
    id: string;
    text: string;
    styleUrl: string;
    keyPlaceholder?: string;
    key?: string
}

/**
 * @see https://cloud.maptiler.com/maps/
 */
export function maptilerStyle(id: string, text: string, maptilerId: string, maptilerKey: string): BackgroundStyle {
    return {
        id: id,
        text: text,
        styleUrl: `https://api.maptiler.com/maps/${maptilerId}/style.json?key=${maptilerKey}`
    };
}

/**
 * @see https://tiles.stadiamaps.com/data/openmaptiles.json
 * @see https://docs.stadiamaps.com/themes/
 */
export function stadiaStyle(id: string, text: string, stadiaId: string, beta = false): BackgroundStyle {
    return {
        id: id,
        text: text,
        styleUrl: `https://tiles${beta ? '-beta' : ''}.stadiamaps.com/styles/${stadiaId}.json`
    };
}

/**
 * @see https://docs.mapbox.com/api/maps/vector-tiles/
 * @see https://docs.mapbox.com/api/maps/styles/#mapbox-styles
 */
export function mapboxStyle(id: string, text: string, mapboxUser: string, mapboxId: string, mapboxToken: string): BackgroundStyle {
    return {
        id: id,
        text: text,
        styleUrl: `https://api.mapbox.com/styles/v1/${mapboxUser}/${mapboxId}/?access_token=${mapboxToken}`
    };
}

/**
 * @see https://www.jawg.io/en/maps/
 * @see https://www.jawg.io/lab/styles
 * @see https://www.jawg.io/docs/integration/maplibre-gl-js/change-style/
 */
export function jawgStyle(id: string, text: string, jawgId: string, jawgToken: string): BackgroundStyle {
    return {
        id: id,
        text: text,
        styleUrl: `https://api.jawg.io/styles/${jawgId}.json?access-token=${jawgToken}`
    };
}

/**
 * Let the user choose the map style.
 **/
export class BackgroundStyleControl extends DropdownControl {
    constructor(backgroundStyles: BackgroundStyle[], startBackgroundStyleId?: string) {
        super(
            '🌍',
            backgroundStyles.map(style => ({
                id: style.id,
                text: style.text,
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
