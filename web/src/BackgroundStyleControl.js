import { Map } from 'maplibre-gl';

/**
 * @see https://cloud.maptiler.com/maps/
 * @param {string} styleId 
 * @param {string} key 
 * @returns {string}
 */
function maptilerStyleUrl(styleId, key) {
    return 'https://api.maptiler.com/maps/' + styleId + '/style.json?key=' + key;
}

const maptiler_key = document.head.querySelector('meta[name="maptiler_key"]')?.content,
    backgroundStyles = {
        streets: { text: 'Streets', style: maptilerStyleUrl('streets', maptiler_key) },
        bright: { text: 'Bright', style: maptilerStyleUrl('bright', maptiler_key) },
        hybrid: { text: 'Satellite', style: maptilerStyleUrl('hybrid', maptiler_key) },
        outdoors: { text: 'Outdoors', style: maptilerStyleUrl('outdoor', maptiler_key) },
        osm_carto: { text: 'OSM Carto', style: maptilerStyleUrl('openstreetmap', maptiler_key) },
    };

/**
 * Let the user choose the map style.
 * 
 * Control implemented as ES6 class
 * @see https://docs.mapbox.com/mapbox-gl-js/api/markers/#icontrol
 **/
class BackgroundStyleControl {
    /**
     * 
     * @param {string} startBackgroundStyle 
     */
    constructor(startBackgroundStyle) {
        this._startBackgroundStyle = startBackgroundStyle;
    }

    /**
     * 
     * @param {Map} map 
     * @returns {HTMLElement}
     */
    onAdd(map) {
        this._map = map;

        this._container = document.createElement('div');
        this._container.className = 'maplibregl-ctrl maplibregl-ctrl-group custom-ctrl background-style-ctrl';

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

        for (const [name, style] of Object.entries(backgroundStyles)) {
            const option = document.createElement('option');
            option.innerText = style.text;
            option.value = name;
            if (name == this._startBackgroundStyle) {
                option.selected = true;
            }
            this._ctrlDropDown.appendChild(option);
        }

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
        const backgroundStyleObj = backgroundStyles[event.target.value];
        console.info("BackgroundStyleControl dropDown click", { backgroundStyleObj, event });
        if (backgroundStyleObj) {
            this._map.setStyle(backgroundStyleObj.style);
            this._ctrlDropDown.className = 'hiddenElement';
            setCulture(this._map);
            //updateDataSource(event);
        } else {
            logErrorMessage("Invalid selected background style", "error", { style: event.target.value });
        }
    }

}

export { BackgroundStyleControl, backgroundStyles };