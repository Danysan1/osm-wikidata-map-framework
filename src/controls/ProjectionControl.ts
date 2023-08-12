import { DropdownControl } from './DropdownControl';

export interface Projection {
    id: string;
    text: string;
}

const projections: Projection[] = [
    { id: "mercator", text: "Web Mercator" }, // https://en.wikipedia.org/wiki/Web_Mercator_projection
    { id: "equirectangular", text: "Equirectangular" }, // https://en.wikipedia.org/wiki/Equirectangular_projection
    { id: "equalEarth", text: "Equal Earth" }, // https://en.wikipedia.org/wiki/Equal_Earth_projection
    { id: "naturalEarth", text: "Natural Earth" }, // https://en.wikipedia.org/wiki/Natural_Earth_projection
    { id: "winkelTripel", text: "Winkel tripel" }, // https://en.wikipedia.org/wiki/Winkel_tripel_projection
    { id: "globe", text: "Globe" }
];

/**
 * Let the user choose the map projection.
 * Currently implemented only in Mpabox GL JS but not in Maplibre GL JS
 * 
 * @see https://maplibre.org/roadmap/globe-view/
 * @see https://github.com/maplibre/maplibre/discussions/161
 * @see https://docs.mapbox.com/mapbox-gl-js/guides/projections/
 * @see https://docs.mapbox.com/mapbox-gl-js/example/projections/
 **/
export class ProjectionControl extends DropdownControl {
    constructor(startProjectionId?: string) {
        super(
            '🌐',
            projections.map(projection => ({
                id: projection.id,
                text: projection.text,
                onSelect: () => {
                    (this.getMap() as any)?.setProjection(projection.id); // Currently not available in Maplibre GL JS
                    this.showDropdown(false);
                }
            })),
            startProjectionId ? startProjectionId : projections[0]?.id,
            'choose_projection'
        );
    }
}
