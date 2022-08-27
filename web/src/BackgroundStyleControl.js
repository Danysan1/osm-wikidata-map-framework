//import { Map } from 'maplibre-gl';
import { Map } from 'mapbox-gl';

/**
 * @typedef {Object} BackgroundStyle
 * @property {string} id
 * @property {string} text
 * @property {string} styleUrl
 */

/**
 * @see https://cloud.maptiler.com/maps/
 * @param {string} id 
 * @param {string} text 
 * @param {string} maptilerId 
 * @param {string} maptilerKey 
 * @returns {BackgroundStyle}
 */
function maptilerBackgroundStyle(id, text, maptilerId, maptilerKey) {
    return { id: id, text: text, styleUrl: 'https://api.maptiler.com/maps/' + maptilerId + '/style.json?key=' + maptilerKey };
}

/**
 * @see https://docs.mapbox.com/api/maps/vector-tiles/
 * @see https://docs.mapbox.com/api/maps/styles/#mapbox-styles
 * @param {string} id 
 * @param {string} text 
 * @param {string} mapboxId 
 * @param {string} mapboxToken 
 * @returns {BackgroundStyle}
 */
function mapboxBackgroundStyle(id, text, mapboxUser, mapboxId, mapboxToken) {
    return { id: id, text: text, styleUrl: 'https://api.mapbox.com/styles/v1/' + mapboxUser + '/' + mapboxId + '/?access_token=' + mapboxToken };
}

/**
 * Let the user choose the map style.
 * 
 * Control implemented as ES6 class
 * @see https://docs.mapbox.com/mapbox-gl-js/api/markers/#icontrol
 **/
class BackgroundStyleControl {
    /**
     * @param {BackgroundStyle[]} backgroundStyles
     * @param {string} startBackgroundStyleId 
     */
    constructor(backgroundStyles, startBackgroundStyleId) {
        this._backgroundStyles = backgroundStyles;
        this._startBackgroundStyleId = startBackgroundStyleId;
    }

    /**
     * 
     * @param {Map} map 
     * @returns {HTMLElement}
     */
    onAdd(map) {
        this._map = map;

        this._container = document.createElement('div');
        this._container.className = 'maplibregl-ctrl maplibregl-ctrl-group mapboxgl-ctrl mapboxgl-ctrl-group custom-ctrl background-style-ctrl';

        const table = document.createElement('table');
        this._container.appendChild(table);

        const tr = document.createElement('tr');
        table.appendChild(tr);

        const td1 = document.createElement('td'),
            td2 = document.createElement('td');
        tr.appendChild(td1);
        tr.appendChild(td2);

        const ctrlBtn = document.createElement('button');
        ctrlBtn.className = 'background-style-ctrl-button';
        ctrlBtn.title = 'Choose background style';
        ctrlBtn.textContent = '🌐';
        // https://stackoverflow.com/questions/36489579/this-within-es6-class-method
        ctrlBtn.onclick = this.btnClickHandler.bind(this);
        td2.appendChild(ctrlBtn);

        this._ctrlDropDown = document.createElement('select');
        this._ctrlDropDown.className = 'hiddenElement';
        this._ctrlDropDown.title = 'Background style';
        this._ctrlDropDown.onchange = this.dropDownClickHandler.bind(this);
        td1.appendChild(this._ctrlDropDown);

        this._backgroundStyles.forEach(style => {
            const option = document.createElement('option');
            option.innerText = style.text;
            option.value = style.id;
            if (style.id == this._startBackgroundStyleId) {
                option.selected = true;
            }
            this._ctrlDropDown.appendChild(option);
        })

        return this._container;
    }

    onRemove() {
        this._container.parentNode.removeChild(this._container);
        this._map = undefined;
    }

    btnClickHandler(event) {
        console.info("BackgroundStyleControl button click", event);
        this._ctrlDropDown.className = 'visibleDropDown';
    }

    dropDownClickHandler(event) {
        const backgroundStyleObj = this._backgroundStyles.find(style => style.id == event.target.value);
        console.info("BackgroundStyleControl dropDown click", { backgroundStyleObj, event });
        if (backgroundStyleObj) {
            this._map.setStyle(backgroundStyleObj.styleUrl);
            this._ctrlDropDown.className = 'hiddenElement';
            //setCulture(this._map);
            //updateDataSource(event);
        } else {
            logErrorMessage("Invalid selected background style", "error", { style: event.target.value });
        }
    }

}

export { BackgroundStyleControl, maptilerBackgroundStyle, mapboxBackgroundStyle };