import { Geocoder } from '@maptiler/geocoder';
import '@maptiler/geocoder/css/geocoder.css';

/**
 * Let the user search locations by name
 * Replaces MapboxGeocoder.
 * 
 * Control implemented as ES6 class
 * @see https://docs.maptiler.com/maplibre-gl-js/geocoder-component/
 */
 export class MaptilerGeocoderControl {
    /**
     * 
     * @param {string} maptiler_key 
     */
    constructor(maptiler_key){
        this._maptiler_key = maptiler_key;
    }

    onAdd(map) {
        this._map = map;
        this._container = document.createElement('div');
        this._container.className = 'maplibregl-ctrl';
        const _input = document.createElement('input');
        this._container.appendChild(_input);
        const geocoder = new Geocoder({
            input: _input,
            key: this._maptiler_key
        });
        geocoder.on('select', function(item) {
            map.fitBounds(item.bbox);
        });
        return this._container;
    }

    onRemove() {
        this._container.parentNode.removeChild(this._container);
        this._map = undefined;
    }
 }