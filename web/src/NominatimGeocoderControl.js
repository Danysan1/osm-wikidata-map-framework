import MaplibreGeocoder from '@maplibre/maplibre-gl-geocoder';
import '@maplibre/maplibre-gl-geocoder/dist/maplibre-gl-geocoder.css';

/**
 * Let the user search locations by name
 * Replaces MapboxGeocoder.
 * 
 * Control implemented as ES6 class
 * @see https://maplibre.org/maplibre-gl-js-docs/example/geocoder/
 */
export class NominatimGeocoderControl extends MaplibreGeocoder {
    /**
     * 
     * @param {object} maplibreGeocoderOptions 
     * @see https://github.com/maplibre/maplibre-gl-geocoder
     * @see https://github.com/maplibre/maplibre-gl-geocoder/blob/main/API.md
     */
    constructor(maplibreGeocoderOptions) {
        super({ forwardGeocode: this.nominatimForwardGeocode }, maplibreGeocoderOptions)
    }

    async nominatimForwardGeocode(config) {
        const features = [];
        try {
            let request =
                'https://nominatim.openstreetmap.org/search?q=' +
                config.query +
                '&format=geojson&polygon_geojson=1&addressdetails=1';
            const response = await fetch(request);
            const geojson = await response.json();
            for (let feature of geojson.features) {
                let center = [
                    feature.bbox[0] +
                    (feature.bbox[2] - feature.bbox[0]) / 2,
                    feature.bbox[1] +
                    (feature.bbox[3] - feature.bbox[1]) / 2
                ];
                let point = {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: center
                    },
                    place_name: feature.properties.display_name,
                    properties: feature.properties,
                    text: feature.properties.display_name,
                    place_type: ['place'],
                    center: center
                };
                features.push(point);
            }
        } catch (e) {
            console.error(`Failed to forwardGeocode with error: ${e}`);
        }

        return {
            features: features
        };
    }
}