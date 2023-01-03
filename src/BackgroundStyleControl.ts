import { DropdownControl } from './DropdownControl';

export interface BackgroundStyle {
    id: string;
    text: string;
    styleUrl: string;
}

/**
 * @see https://cloud.maptiler.com/maps/
 */
export function maptilerBackgroundStyle(id: string, text: string, maptilerId: string, maptilerKey: string): BackgroundStyle {
    return {
        id: id,
        text: text,
        styleUrl: 'https://api.maptiler.com/maps/' + maptilerId + '/style.json?key=' + maptilerKey
    };
}

/**
 * @see https://docs.mapbox.com/api/maps/vector-tiles/
 * @see https://docs.mapbox.com/api/maps/styles/#mapbox-styles
 */
export function mapboxBackgroundStyle(id: string, text: string, mapboxUser: string, mapboxId: string, mapboxToken: string): BackgroundStyle {
    return {
        id: id,
        text: text,
        styleUrl: 'https://api.mapbox.com/styles/v1/' + mapboxUser + '/' + mapboxId + '/?access_token=' + mapboxToken
    };
}

/**
 * Let the user choose the map style.
 **/
export class BackgroundStyleControl extends DropdownControl {

    constructor(backgroundStyles: BackgroundStyle[], startBackgroundStyleId?: string) {
        super(
            '🌐',
            backgroundStyles.map(style => ({
                id: style.id, text: style.text, onSelect: () => this.getMap()?.setStyle(style.styleUrl)
            })),
            startBackgroundStyleId ? startBackgroundStyleId : backgroundStyles[0]?.id,
            'Choose background style'
        );
    }
}
